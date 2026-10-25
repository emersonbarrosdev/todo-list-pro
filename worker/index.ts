/**
 * TODO PRO - Cloudflare Worker API & Static Assets Handler
 * Service: todo-pro
 * Database: todo-pro-db (Cloudflare D1)
 *
 * Security & Free-tier Hardening:
 * - Cryptographic RS256 JWT signature verification (Web Crypto API)
 * - Strict rejection of mock tokens in production (401 Unauthorized)
 * - Networkless local token verification (0 Clerk backend calls per API request)
 * - Strict CORS allowlist (No wildcard '*' in production)
 * - D1 single-statement batch persistence (Minimal rows read/written)
 * - User isolation enforced across all Projects and Tasks
 * - Cloudflare Static Assets for SPA routes
 */

export interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
  error?: string;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = any>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = any>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface ProfileRow {
  id: string;
  clerk_user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_at: string | null;
  qa_checklist: string;
  qa_result: string;
  qa_notes: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string;
}

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DB: D1Database;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_JWT_KEY?: string;
  ENVIRONMENT?: string;
  ALLOW_TEST_MOCK_TOKEN?: boolean;
}

// Allowed CORS origins: production Worker URL and standard local development origins
const ALLOWED_ORIGINS = [
  'https://todo-pro.botanstudio.workers.dev',
  'http://localhost:4200',
  'http://localhost:8787',
  'http://127.0.0.1:4200',
  'http://127.0.0.1:8787',
];

function getCorsOrigin(request?: Request): string {
  if (!request) return 'https://todo-pro.botanstudio.workers.dev';
  const origin = request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return 'https://todo-pro.botanstudio.workers.dev';
}

function json(data: unknown, status = 200, request?: Request): Response {
  const origin = getCorsOrigin(request);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// Clerk Instance Public JWK for networkless cryptographic RS256 signature verification
const CLERK_JWK = {
  kty: 'RSA',
  use: 'sig',
  alg: 'RS256',
  kid: 'ins_3L3EJj8FXBURDNq1yNkH0OJli4C',
  n: 'yldx-Q2EVJFNj9ygV3mnyLz94K6GnbJnrFVAF4H8Iz7E-e7xjIzWSRrv-i_zqc_Ep_QXGpb9Uu_qkpPsPucOVDmT4b60jG-NHszpB_ygdKYRrFxDHWyMoV96WTC2vj1aweXjOcvhQZdnevehz0eEFBIUNx_xLuwO8kTqcI0j92D7hKpNk8A8cqQ6Mhqeg7adzshgHaV7nhJ-6gyYav31SJr70V2MCZV8sunb1h2D32Smtyb-t0q8KUNLTrGDXrQIiq8GzMcX29kAp3ZiCRa22kEKEsUCBpIXZBw2prBs7Hktjio1s1aonsiqOPF5z2sByRmlbdqzyTbjTzcFGS00ew',
  e: 'AQAB',
};

let cachedCryptoKey: CryptoKey | null = null;

async function getPublicKey(jwtKeyPem?: string): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  if (jwtKeyPem) {
    const cleanPem = jwtKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '');
    const binaryDer = Uint8Array.from(atob(cleanPem), (c) => c.charCodeAt(0));
    cachedCryptoKey = await crypto.subtle.importKey(
      'spki',
      binaryDer.buffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );
    return cachedCryptoKey;
  }

  cachedCryptoKey = await crypto.subtle.importKey(
    'jwk',
    CLERK_JWK,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
  return cachedCryptoKey;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecode(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Validates JWT cryptographically using Web Crypto API.
 * In production, mock tokens are STRICTLY REJECTED with 401.
 * Checks signature, algorithm (RS256), expiration, not-before, and issuer.
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  // STRICT SECURITY CHECK: Reject mock tokens in production unconditionally
  if (token.startsWith('mock_token_')) {
    const url = new URL(request.url);
    const isProduction =
      url.hostname.includes('workers.dev') ||
      env.ENVIRONMENT === 'production' ||
      !env.ALLOW_TEST_MOCK_TOKEN;

    if (isProduction) {
      return null; // Enforce 401 Unauthorized in production!
    }

    const mockId = token.replace('mock_token_', '');
    return { userId: mockId || 'mock-user' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null; // Malformed JWT
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return null; // Invalid JSON encoding
  }

  // 1. Mandatory algorithm verification
  if (header.alg !== 'RS256') {
    return null;
  }

  // 2. Mandatory subject claim
  if (!payload.sub || typeof payload.sub !== 'string') {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // 3. Expiration verification (exp)
  if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < nowSec) {
    return null; // Expired token
  }

  // 4. Not-before verification (nbf)
  if (payload.nbf && typeof payload.nbf === 'number' && payload.nbf > nowSec + 10) {
    return null;
  }

  // 5. Issuer check (iss)
  if (payload.iss && typeof payload.iss === 'string' && !payload.iss.includes('clerk')) {
    return null;
  }

  // 6. Cryptographic RS256 signature verification
  try {
    const key = await getPublicKey(env.CLERK_JWT_KEY);
    const signatureBytes = base64UrlToUint8Array(signatureB64);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signatureBytes,
      signedData
    );

    if (!isValid) {
      return null; // Forged or invalid signature!
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Ensures user has at least one active project in D1.
 * Returns the default project for the user.
 */
async function ensureDefaultProject(db: D1Database, userId: string): Promise<ProjectRow> {
  const existing = await db
    .prepare('SELECT * FROM projects WHERE user_id = ? AND archived = 0 ORDER BY created_at ASC')
    .bind(userId)
    .first<ProjectRow>();

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const defaultId = 'proj_' + crypto.randomUUID().slice(0, 12);
  const newProject: ProjectRow = {
    id: defaultId,
    user_id: userId,
    name: 'Meu Projeto',
    description: 'Projeto principal',
    archived: 0,
    created_at: now,
    updated_at: now,
  };

  await db
    .prepare(
      'INSERT INTO projects (id, user_id, name, description, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      newProject.id,
      newProject.user_id,
      newProject.name,
      newProject.description,
      newProject.archived,
      newProject.created_at,
      newProject.updated_at
    )
    .run();

  // Associate any orphan tasks with this default project
  await db
    .prepare(
      'UPDATE tasks SET project_id = ? WHERE user_id = ? AND (project_id IS NULL OR project_id = "")'
    )
    .bind(newProject.id, userId)
    .run()
    .catch(() => {});

  return newProject;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const origin = getCorsOrigin(request);
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 1. Health check (public)
    if (url.pathname === '/api/health') {
      return json(
        {
          status: 'ok',
          service: 'todo-pro',
          timestamp: new Date().toISOString(),
        },
        200,
        request
      );
    }

    // 2. All /api/* routes require cryptographic authentication
    if (url.pathname.startsWith('/api/')) {
      try {
        const auth = await authenticateRequest(request, env);
        if (!auth) {
          return json(
            { error: 'Não autorizado ou sessão expirada. Faça login novamente.' },
            401,
            request
          );
        }

        const { userId } = auth;

        if (!env.DB) {
          return json(
            { error: 'Banco de dados D1 indisponível momentaneamente.' },
            503,
            request
          );
        }

        // --- Profile Routes: /api/profile ---
        if (url.pathname === '/api/profile') {
          if (request.method === 'GET') {
            const profile = await env.DB.prepare(
              'SELECT * FROM profiles WHERE clerk_user_id = ?'
            )
              .bind(userId)
              .first<ProfileRow>();

            if (!profile) {
              const now = new Date().toISOString();
              const newProfile: ProfileRow = {
                id: 'prof_' + crypto.randomUUID().slice(0, 12),
                clerk_user_id: userId,
                display_name: 'Usuário',
                created_at: now,
                updated_at: now,
              };

              await env.DB.prepare(
                'INSERT INTO profiles (id, clerk_user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
              )
                .bind(
                  newProfile.id,
                  newProfile.clerk_user_id,
                  newProfile.display_name,
                  newProfile.created_at,
                  newProfile.updated_at
                )
                .run()
                .catch(() => {});

              return json(newProfile, 200, request);
            }

            return json(profile, 200, request);
          }

          if (request.method === 'PUT') {
            const body: any = await request.json().catch(() => ({}));
            const now = new Date().toISOString();

            const existing = await env.DB.prepare(
              'SELECT * FROM profiles WHERE clerk_user_id = ?'
            )
              .bind(userId)
              .first<ProfileRow>();

            const displayName =
              body.display_name !== undefined
                ? body.display_name
                : existing?.display_name || 'Usuário';

            if (existing) {
              await env.DB.prepare(
                'UPDATE profiles SET display_name = ?, updated_at = ? WHERE clerk_user_id = ?'
              )
                .bind(displayName, now, userId)
                .run();
            } else {
              await env.DB.prepare(
                'INSERT INTO profiles (id, clerk_user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
              )
                .bind('prof_' + crypto.randomUUID().slice(0, 12), userId, displayName, now, now)
                .run();
            }

            return json(
              {
                id: existing?.id || userId,
                display_name: displayName,
                updated_at: now,
              },
              200,
              request
            );
          }

          return json({ error: 'Método não permitido.' }, 405, request);
        }

        // --- Projects Collection Routes: /api/projects ---
        if (url.pathname === '/api/projects') {
          if (request.method === 'GET') {
            const includeArchived = url.searchParams.get('archived') === 'true';

            let query = 'SELECT * FROM projects WHERE user_id = ?';
            if (!includeArchived) {
              query += ' AND archived = 0';
            }
            query += ' ORDER BY created_at ASC';

            const { results } = await env.DB.prepare(query).bind(userId).all<ProjectRow>();

            let projects = results || [];

            // Auto-seed default project if user has no projects yet
            if (projects.length === 0 && !includeArchived) {
              const defaultProj = await ensureDefaultProject(env.DB, userId);
              projects = [defaultProj];
            }

            const mapped = projects.map((p) => ({
              ...p,
              archived: Boolean(p.archived),
            }));

            return json(mapped, 200, request);
          }

          if (request.method === 'POST') {
            const body: any = await request.json().catch(() => ({}));
            const name = (body.name || '').trim();
            if (!name) {
              return json({ error: 'O nome do projeto é obrigatório.' }, 400, request);
            }

            const now = new Date().toISOString();
            const id = 'proj_' + crypto.randomUUID().slice(0, 12);
            const description = (body.description || '').trim();

            await env.DB.prepare(
              'INSERT INTO projects (id, user_id, name, description, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
            )
              .bind(id, userId, name, description, now, now)
              .run();

            return json(
              {
                id,
                user_id: userId,
                name,
                description,
                archived: false,
                created_at: now,
                updated_at: now,
              },
              201,
              request
            );
          }

          return json({ error: 'Método não permitido.' }, 405, request);
        }

        // --- Project Item Routes: /api/projects/:id ---
        const projectItemMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
        if (projectItemMatch) {
          const projectId = projectItemMatch[1];

          if (request.method === 'GET') {
            const project = await env.DB.prepare(
              'SELECT * FROM projects WHERE id = ? AND user_id = ?'
            )
              .bind(projectId, userId)
              .first<ProjectRow>();

            if (!project) {
              return json({ error: 'Projeto não encontrado.' }, 404, request);
            }

            return json(
              {
                ...project,
                archived: Boolean(project.archived),
              },
              200,
              request
            );
          }

          if (request.method === 'PUT' || request.method === 'PATCH') {
            const body: any = await request.json().catch(() => ({}));
            const existing = await env.DB.prepare(
              'SELECT * FROM projects WHERE id = ? AND user_id = ?'
            )
              .bind(projectId, userId)
              .first<ProjectRow>();

            if (!existing) {
              return json({ error: 'Projeto não encontrado.' }, 404, request);
            }

            const now = new Date().toISOString();
            const name = body.name !== undefined ? body.name.trim() : existing.name;
            const description =
              body.description !== undefined ? body.description.trim() : existing.description;
            const archived =
              body.archived !== undefined ? (body.archived ? 1 : 0) : existing.archived;

            if (!name) {
              return json({ error: 'O nome do projeto não pode ser vazio.' }, 400, request);
            }

            await env.DB.prepare(
              'UPDATE projects SET name = ?, description = ?, archived = ?, updated_at = ? WHERE id = ? AND user_id = ?'
            )
              .bind(name, description, archived, now, projectId, userId)
              .run();

            return json(
              {
                id: projectId,
                user_id: userId,
                name,
                description,
                archived: Boolean(archived),
                created_at: existing.created_at,
                updated_at: now,
              },
              200,
              request
            );
          }

          return json({ error: 'Método não permitido.' }, 405, request);
        }

        // --- Project Tasks Route: /api/projects/:projectId/tasks ---
        const projectTasksMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/tasks$/);
        if (projectTasksMatch) {
          const targetProjectId = projectTasksMatch[1];

          if (request.method === 'GET') {
            const { results } = await env.DB.prepare(
              `SELECT t.*, p.name AS project_name
               FROM tasks t
               LEFT JOIN projects p ON t.project_id = p.id
               WHERE t.user_id = ? AND t.project_id = ?
               ORDER BY t.created_at DESC`
            )
              .bind(userId, targetProjectId)
              .all<TaskRow>();

            const tasks = (results || []).map((row) => ({
              ...row,
              qa_checklist:
                typeof row.qa_checklist === 'string'
                  ? JSON.parse(row.qa_checklist || '[]')
                  : row.qa_checklist || [],
            }));

            return json(tasks, 200, request);
          }

          return json({ error: 'Método não permitido.' }, 405, request);
        }

        // --- Tasks Collection Routes: /api/tasks ---
        if (url.pathname === '/api/tasks') {
          if (request.method === 'GET') {
            const projectIdParam = url.searchParams.get('projectId');

            let query = `
              SELECT t.*, p.name AS project_name
              FROM tasks t
              LEFT JOIN projects p ON t.project_id = p.id
              WHERE t.user_id = ?
            `;
            const params: any[] = [userId];

            if (projectIdParam && projectIdParam !== 'all') {
              query += ' AND t.project_id = ?';
              params.push(projectIdParam);
            }

            query += ' ORDER BY t.created_at DESC';

            const { results } = await env.DB.prepare(query).bind(...params).all<TaskRow>();

            const tasks = (results || []).map((row) => ({
              ...row,
              qa_checklist:
                typeof row.qa_checklist === 'string'
                  ? JSON.parse(row.qa_checklist || '[]')
                  : row.qa_checklist || [],
            }));

            return json(tasks, 200, request);
          }

          if (request.method === 'POST') {
            const body: any = await request.json().catch(() => ({}));
            const title = (body.title || '').trim();
            if (!title) {
              return json({ error: 'O título da tarefa é obrigatório.' }, 400, request);
            }

            // Ensure valid project_id belonging to user
            let targetProjectId = body.project_id;
            if (targetProjectId) {
              const projectCheck = await env.DB.prepare(
                'SELECT id FROM projects WHERE id = ? AND user_id = ?'
              )
                .bind(targetProjectId, userId)
                .first();

              if (!projectCheck) {
                targetProjectId = null;
              }
            }

            if (!targetProjectId) {
              const defaultProj = await ensureDefaultProject(env.DB, userId);
              targetProjectId = defaultProj.id;
            }

            const now = new Date().toISOString();
            const id = 'task_' + crypto.randomUUID();
            const description = body.description || '';
            const status = body.status || 'backlog';
            const priority = body.priority || 'normal';
            const due_at = body.due_at || null;
            const qa_checklist = JSON.stringify(body.qa_checklist || []);
            const qa_result = body.qa_result || 'pending';
            const qa_notes = body.qa_notes || '';
            const completed_at = status === 'done' ? now : null;

            await env.DB.prepare(
              `INSERT INTO tasks (
                id, project_id, user_id, title, description, status, priority,
                due_at, qa_checklist, qa_result, qa_notes, completed_at,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                id,
                targetProjectId,
                userId,
                title,
                description,
                status,
                priority,
                due_at,
                qa_checklist,
                qa_result,
                qa_notes,
                completed_at,
                now,
                now
              )
              .run();

            return json(
              {
                id,
                project_id: targetProjectId,
                user_id: userId,
                title,
                description,
                status,
                priority,
                due_at,
                qa_checklist: body.qa_checklist || [],
                qa_result,
                qa_notes,
                completed_at,
                created_at: now,
                updated_at: now,
              },
              201,
              request
            );
          }

          return json({ error: 'Método não permitido.' }, 405, request);
        }

        // --- Task Item Routes: /api/tasks/:id ---
        const taskItemMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
        if (taskItemMatch) {
          const taskId = taskItemMatch[1];

          if (request.method === 'GET') {
            const row = await env.DB.prepare(
              `SELECT t.*, p.name AS project_name
               FROM tasks t
               LEFT JOIN projects p ON t.project_id = p.id
               WHERE t.id = ? AND t.user_id = ?`
            )
              .bind(taskId, userId)
              .first<TaskRow>();

            if (!row) {
              return json({ error: 'Tarefa não encontrada.' }, 404, request);
            }

            return json(
              {
                ...row,
                qa_checklist:
                  typeof row.qa_checklist === 'string'
                    ? JSON.parse(row.qa_checklist || '[]')
                    : row.qa_checklist || [],
              },
              200,
              request
            );
          }

          if (request.method === 'PUT' || request.method === 'PATCH') {
            const body: any = await request.json().catch(() => ({}));
            const now = new Date().toISOString();

            // Strict user isolation check
            const existing = await env.DB.prepare(
              'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
            )
              .bind(taskId, userId)
              .first<TaskRow>();

            if (!existing) {
              return json({ error: 'Tarefa não encontrada ou permissão negada.' }, 404, request);
            }

            const title = body.title !== undefined ? body.title.trim() : existing.title;
            const description =
              body.description !== undefined ? body.description : existing.description;
            const status = body.status !== undefined ? body.status : existing.status;
            const priority = body.priority !== undefined ? body.priority : existing.priority;
            const due_at = body.due_at !== undefined ? body.due_at : existing.due_at;
            const qa_checklist =
              body.qa_checklist !== undefined
                ? JSON.stringify(body.qa_checklist)
                : existing.qa_checklist;
            const qa_result = body.qa_result !== undefined ? body.qa_result : existing.qa_result;
            const qa_notes = body.qa_notes !== undefined ? body.qa_notes : existing.qa_notes;

            let projectId = existing.project_id;
            if (body.project_id && body.project_id !== existing.project_id) {
              const projectCheck = await env.DB.prepare(
                'SELECT id FROM projects WHERE id = ? AND user_id = ?'
              )
                .bind(body.project_id, userId)
                .first();

              if (projectCheck) {
                projectId = body.project_id;
              }
            }

            let completed_at = existing.completed_at;
            if (status === 'done' && !existing.completed_at) {
              completed_at = now;
            } else if (status !== 'done') {
              completed_at = null;
            }

            // Single update write to D1
            await env.DB.prepare(
              `UPDATE tasks SET
                project_id = ?, title = ?, description = ?, status = ?, priority = ?,
                due_at = ?, qa_checklist = ?, qa_result = ?, qa_notes = ?,
                completed_at = ?, updated_at = ?
              WHERE id = ? AND user_id = ?`
            )
              .bind(
                projectId,
                title,
                description,
                status,
                priority,
                due_at,
                qa_checklist,
                qa_result,
                qa_notes,
                completed_at,
                now,
                taskId,
                userId
              )
              .run();

            return json(
              {
                id: taskId,
                project_id: projectId,
                user_id: userId,
                title,
                description,
                status,
                priority,
                due_at,
                qa_checklist:
                  typeof qa_checklist === 'string' ? JSON.parse(qa_checklist) : qa_checklist,
                qa_result,
                qa_notes,
                completed_at,
                created_at: existing.created_at,
                updated_at: now,
              },
              200,
              request
            );
          }

          if (request.method === 'DELETE') {
            await env.DB.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
              .bind(taskId, userId)
              .run();

            return json({ success: true, message: 'Tarefa removida com sucesso.' }, 200, request);
          }

          return json({ error: 'Método não permitido.' }, 405, request);
        }

        return json({ error: 'Endpoint não encontrado.' }, 404, request);
      } catch {
        return json({ error: 'Erro interno ao processar a requisição.' }, 500, request);
      }
    }

    // 3. Fallback to Cloudflare Static Assets for SPA
    return env.ASSETS.fetch(request);
  },
};

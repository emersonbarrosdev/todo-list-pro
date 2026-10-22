/**
 * TODO PRO - Cloudflare Worker API & Static Assets Handler
 * Service: todo-pro
 * Database: todo-pro-db (Cloudflare D1)
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
  work_mode: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  tags: string;
  checklist: string;
  work_mode: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DB: D1Database;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
}

interface JWTPayload {
  sub?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  [key: string]: unknown;
}

// Helper: JSON response with CORS and security headers
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

function parseJwt(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Authenticate request and extract Clerk User ID (sub)
async function authenticate(request: Request, env: Env): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) return null;

  // Mock / dev token support for hermetic local testing
  if (token.startsWith('mock_token_')) {
    const mockId = token.replace('mock_token_', '');
    return { userId: mockId || 'mock-user' };
  }

  const payload = parseJwt(token);
  if (!payload || !payload.sub) {
    return null;
  }

  // Check expiration if present
  if (payload.exp && typeof payload.exp === 'number') {
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSec) {
      return null;
    }
  }

  return { userId: payload.sub };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 1. Health check (public)
    if (url.pathname === '/api/health') {
      return json({
        status: 'ok',
        service: 'todo-pro',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. All /api/* routes require authentication
    if (url.pathname.startsWith('/api/')) {
      try {
        const auth = await authenticate(request, env);
        if (!auth) {
          return json({ error: 'Não autorizado ou sessão expirada. Faça login novamente.' }, 401);
        }

      const { userId } = auth;

      // Ensure D1 database is bound
      if (!env.DB) {
        return json({ error: 'Banco de dados D1 indisponível momentaneamente.' }, 503);
      }

      // --- Profile Routes ---
      if (url.pathname === '/api/profile') {
        if (request.method === 'GET') {
          const profile = await env.DB.prepare(
            'SELECT * FROM profiles WHERE clerk_user_id = ?'
          )
            .bind(userId)
            .first<ProfileRow>();

          if (!profile) {
            // Auto-create initial profile for new Clerk user
            const now = new Date().toISOString();
            const newProfile: ProfileRow = {
              id: 'prof_' + crypto.randomUUID().slice(0, 12),
              clerk_user_id: userId,
              display_name: 'Usuário',
              work_mode: 'general',
              created_at: now,
              updated_at: now,
            };

            await env.DB.prepare(
              'INSERT INTO profiles (id, clerk_user_id, display_name, work_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
              .bind(
                newProfile.id,
                newProfile.clerk_user_id,
                newProfile.display_name,
                newProfile.work_mode,
                newProfile.created_at,
                newProfile.updated_at
              )
              .run();

            return json({
              id: newProfile.id,
              display_name: newProfile.display_name,
              work_mode: newProfile.work_mode,
              created_at: newProfile.created_at,
              updated_at: newProfile.updated_at,
            });
          }

          return json({
            id: profile.id,
            display_name: profile.display_name,
            work_mode: profile.work_mode,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
          });
        }

        if (request.method === 'PUT') {
          const body: any = await request.json().catch(() => ({}));
          const now = new Date().toISOString();

          const existing = await env.DB.prepare(
            'SELECT * FROM profiles WHERE clerk_user_id = ?'
          )
            .bind(userId)
            .first<ProfileRow>();

          const displayName = body.display_name !== undefined ? body.display_name : (existing?.display_name || 'Usuário');
          const workMode = body.work_mode !== undefined ? body.work_mode : (existing?.work_mode || 'general');

          if (existing) {
            await env.DB.prepare(
              'UPDATE profiles SET display_name = ?, work_mode = ?, updated_at = ? WHERE clerk_user_id = ?'
            )
              .bind(displayName, workMode, now, userId)
              .run();
          } else {
            await env.DB.prepare(
              'INSERT INTO profiles (id, clerk_user_id, display_name, work_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
              .bind('prof_' + crypto.randomUUID().slice(0, 12), userId, displayName, workMode, now, now)
              .run();
          }

          return json({
            id: existing?.id || userId,
            display_name: displayName,
            work_mode: workMode,
            updated_at: now,
          });
        }

        return json({ error: 'Método não permitido.' }, 405);
      }

      // --- Tasks Collection Routes: /api/tasks ---
      if (url.pathname === '/api/tasks') {
        if (request.method === 'GET') {
          const status = url.searchParams.get('status');
          const workMode = url.searchParams.get('workMode');
          const priority = url.searchParams.get('priority');
          const sortBy = url.searchParams.get('sortBy');

          let query = 'SELECT * FROM tasks WHERE user_id = ?';
          const params: any[] = [userId];

          if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
          }

          if (workMode && workMode !== 'all') {
            query += ' AND work_mode = ?';
            params.push(workMode);
          }

          if (priority && priority !== 'all') {
            query += ' AND priority = ?';
            params.push(priority);
          }

          if (sortBy === 'oldest') {
            query += ' ORDER BY created_at ASC';
          } else if (sortBy === 'due_date') {
            query += ' ORDER BY due_at ASC';
          } else {
            query += ' ORDER BY created_at DESC';
          }

          const { results } = await env.DB.prepare(query).bind(...params).all();

          // Parse JSON fields
          const tasks = (results || []).map((row: any) => ({
            ...row,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : row.tags || [],
            checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist || '[]') : row.checklist || [],
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata || {},
          }));

          return json(tasks);
        }

        if (request.method === 'POST') {
          const body: any = await request.json().catch(() => ({}));
          const now = new Date().toISOString();

          const id = 'task_' + crypto.randomUUID();
          const title = (body.title || '').trim();
          if (!title) {
            return json({ error: 'O título da tarefa é obrigatório.' }, 400);
          }

          const description = body.description || '';
          const status = body.status || 'todo';
          const priority = body.priority || 'normal';
          const due_at = body.due_at || null;
          const tags = JSON.stringify(body.tags || []);
          const checklist = JSON.stringify(body.checklist || []);
          const work_mode = body.work_mode || 'general';
          const metadata = JSON.stringify(body.metadata || {});
          const completed_at = status === 'done' ? now : null;

          // Never trust userId from body; use authenticated userId
          await env.DB.prepare(
            `INSERT INTO tasks (
              id, user_id, title, description, status, priority,
              due_at, completed_at, tags, checklist, work_mode, metadata,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              id,
              userId,
              title,
              description,
              status,
              priority,
              due_at,
              completed_at,
              tags,
              checklist,
              work_mode,
              metadata,
              now,
              now
            )
            .run();

          return json(
            {
              id,
              user_id: userId,
              title,
              description,
              status,
              priority,
              due_at,
              completed_at,
              tags: body.tags || [],
              checklist: body.checklist || [],
              work_mode,
              metadata: body.metadata || {},
              created_at: now,
              updated_at: now,
            },
            201
          );
        }

        return json({ error: 'Método não permitido.' }, 405);
      }

      // --- Task Item Routes: /api/tasks/:id ---
      const taskItemMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (taskItemMatch) {
        const taskId = taskItemMatch[1];

        if (request.method === 'GET') {
          const row = await env.DB.prepare(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
          )
            .bind(taskId, userId)
            .first<TaskRow>();

          if (!row) {
            return json({ error: 'Tarefa não encontrada.' }, 404);
          }

          return json({
            ...row,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : row.tags || [],
            checklist: typeof row.checklist === 'string' ? JSON.parse(row.checklist || '[]') : row.checklist || [],
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : row.metadata || {},
          });
        }

        if (request.method === 'PUT') {
          const body: any = await request.json().catch(() => ({}));
          const now = new Date().toISOString();

          // Check ownership
          const existing = await env.DB.prepare(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?'
          )
            .bind(taskId, userId)
            .first<TaskRow>();

          if (!existing) {
            return json({ error: 'Tarefa não encontrada ou permissão negada.' }, 404);
          }

          const title = body.title !== undefined ? body.title.trim() : existing.title;
          const description = body.description !== undefined ? body.description : existing.description;
          const status = body.status !== undefined ? body.status : existing.status;
          const priority = body.priority !== undefined ? body.priority : existing.priority;
          const due_at = body.due_at !== undefined ? body.due_at : existing.due_at;
          const tags = body.tags !== undefined ? JSON.stringify(body.tags) : existing.tags;
          const checklist = body.checklist !== undefined ? JSON.stringify(body.checklist) : existing.checklist;
          const work_mode = body.work_mode !== undefined ? body.work_mode : existing.work_mode;
          const metadata = body.metadata !== undefined ? JSON.stringify(body.metadata) : existing.metadata;

          let completed_at = existing.completed_at;
          if (body.status === 'done' && !existing.completed_at) {
            completed_at = now;
          } else if (body.status && body.status !== 'done') {
            completed_at = null;
          }

          await env.DB.prepare(
            `UPDATE tasks SET
              title = ?, description = ?, status = ?, priority = ?,
              due_at = ?, completed_at = ?, tags = ?, checklist = ?,
              work_mode = ?, metadata = ?, updated_at = ?
            WHERE id = ? AND user_id = ?`
          )
            .bind(
              title,
              description,
              status,
              priority,
              due_at,
              completed_at,
              tags,
              checklist,
              work_mode,
              metadata,
              now,
              taskId,
              userId
            )
            .run();

          return json({
            id: taskId,
            user_id: userId,
            title,
            description,
            status,
            priority,
            due_at,
            completed_at,
            tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
            checklist: typeof checklist === 'string' ? JSON.parse(checklist) : checklist,
            work_mode,
            metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
            created_at: existing.created_at,
            updated_at: now,
          });
        }

        if (request.method === 'DELETE') {
          const res = await env.DB.prepare(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?'
          )
            .bind(taskId, userId)
            .run();

          return json({ success: true, message: 'Tarefa removida com sucesso.' });
        }

        return json({ error: 'Método não permitido.' }, 405);
      }

      return json({ error: 'Endpoint não encontrado.' }, 404);
    } catch {
      return json({ error: 'Erro interno ao processar a requisição.' }, 500);
    }
  }

    // 3. Fallback to Cloudflare Static Assets for SPA
    return env.ASSETS.fetch(request);
  },
};

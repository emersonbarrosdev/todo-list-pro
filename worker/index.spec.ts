import { describe, it, expect, beforeEach } from 'vitest';
import worker, { authenticateRequest, Env } from './index';

function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('Worker Security & Cryptographic JWT Validation', () => {
  let mockDbStorage: {
    projects: any[];
    tasks: any[];
    profiles: any[];
  };

  const createMockDb = () => {
    mockDbStorage = {
      projects: [],
      tasks: [],
      profiles: [],
    };

    return {
      prepare: (query: string) => {
        let boundArgs: any[] = [];
        return {
          bind: (...args: any[]) => {
            boundArgs = args;
            return {
              first: async <T>() => {
                if (query.includes('FROM profiles WHERE clerk_user_id = ?')) {
                  return (mockDbStorage.profiles.find((p) => p.clerk_user_id === boundArgs[0]) || null) as T;
                }
                if (query.includes('FROM projects WHERE id = ? AND user_id = ?')) {
                  return (mockDbStorage.projects.find((p) => p.id === boundArgs[0] && p.user_id === boundArgs[1]) || null) as T;
                }
                if (query.includes('FROM projects WHERE user_id = ? AND archived = 0')) {
                  return (mockDbStorage.projects.find((p) => p.user_id === boundArgs[0] && !p.archived) || null) as T;
                }
                if (query.includes('FROM tasks WHERE id = ? AND user_id = ?')) {
                  const task = mockDbStorage.tasks.find((t) => t.id === boundArgs[0] && t.user_id === boundArgs[1]);
                  return (task || null) as T;
                }
                return null as T;
              },
              all: async <T>() => {
                if (query.includes('FROM projects WHERE user_id = ?')) {
                  const includeArchived = !query.includes('AND archived = 0');
                  const list = mockDbStorage.projects.filter(
                    (p) => p.user_id === boundArgs[0] && (includeArchived ? true : !p.archived)
                  );
                  return { results: list as T[] };
                }
                if (query.includes('FROM tasks')) {
                  let list = mockDbStorage.tasks.filter((t) => t.user_id === boundArgs[0]);
                  if (boundArgs.length > 1 && boundArgs[1]) {
                    list = list.filter((t) => t.project_id === boundArgs[1]);
                  }
                  return { results: list as T[] };
                }
                return { results: [] as T[] };
              },
              run: async () => {
                if (query.includes('INSERT INTO projects')) {
                  mockDbStorage.projects.push({
                    id: boundArgs[0],
                    user_id: boundArgs[1],
                    name: boundArgs[2],
                    description: boundArgs[3],
                    archived: boundArgs[4],
                    created_at: boundArgs[5],
                    updated_at: boundArgs[6],
                  });
                }
                if (query.includes('INSERT INTO tasks')) {
                  mockDbStorage.tasks.push({
                    id: boundArgs[0],
                    project_id: boundArgs[1],
                    user_id: boundArgs[2],
                    title: boundArgs[3],
                    description: boundArgs[4],
                    status: boundArgs[5],
                    priority: boundArgs[6],
                    due_at: boundArgs[7],
                    qa_checklist: boundArgs[8],
                    qa_result: boundArgs[9],
                    qa_notes: boundArgs[10],
                    completed_at: boundArgs[11],
                    created_at: boundArgs[12],
                    updated_at: boundArgs[13],
                  });
                }
                if (query.includes('DELETE FROM tasks WHERE id = ? AND user_id = ?')) {
                  mockDbStorage.tasks = mockDbStorage.tasks.filter(
                    (t) => !(t.id === boundArgs[0] && t.user_id === boundArgs[1])
                  );
                }
                return { success: true };
              },
            };
          },
        };
      },
    };
  };

  const dummyEnv: Env = {
    ASSETS: { fetch: async () => new Response('Asset') },
    DB: createMockDb() as any,
  };

  beforeEach(() => {
    dummyEnv.DB = createMockDb() as any;
  });

  it('should reject request with 401 when no token is provided', async () => {
    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      method: 'GET',
    });

    const res = await worker.fetch(req, dummyEnv);
    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Não autorizado');
  });

  it('should STRICTLY reject mock_token_ in production with 401', async () => {
    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock_token_attacker',
      },
    });

    const res = await worker.fetch(req, dummyEnv);
    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Não autorizado');
  });

  it('should reject request with 401 when token is malformed', async () => {
    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer not-a-jwt-token',
      },
    });

    const res = await worker.fetch(req, dummyEnv);
    expect(res.status).toBe(401);
  });

  it('should reject request with 401 when token has expired', async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour in the past
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64UrlEncode(
      JSON.stringify({ sub: 'user_valid', exp: pastExp, iss: 'https://clerk.accounts.dev' })
    );
    const fakeSig = base64UrlEncode('fake_signature_bytes');

    const expiredJwt = `${header}.${payload}.${fakeSig}`;

    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${expiredJwt}`,
      },
    });

    const res = await worker.fetch(req, dummyEnv);
    expect(res.status).toBe(401);
  });

  it('should reject request with 401 when token has valid sub and future exp but forged/fake signature', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64UrlEncode(
      JSON.stringify({
        sub: 'user_target_victim',
        exp: futureExp,
        iss: 'https://expert-wombat-5938.clerk.accounts.dev',
      })
    );
    const forgedSig = base64UrlEncode('forged_unauthorized_signature');
    const forgedJwt = `${header}.${payload}.${forgedSig}`;

    const reqTasks = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${forgedJwt}`,
      },
    });

    const resTasks = await worker.fetch(reqTasks, dummyEnv);
    expect(resTasks.status).toBe(401);
  });

  it('should reject request with 401 when token payload has been tampered with', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const tamperedPayload = base64UrlEncode(JSON.stringify({ sub: 'admin', exp: futureExp }));
    const randomSig = base64UrlEncode('random_signature');
    const tamperedJwt = `${header}.${tamperedPayload}.${randomSig}`;

    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      headers: {
        Authorization: `Bearer ${tamperedJwt}`,
      },
    });

    const res = await worker.fetch(req, dummyEnv);
    expect(res.status).toBe(401);
  });

  it('should enforce user isolation: User B cannot access or modify User A task or project', async () => {
    const devEnv: Env = {
      ...dummyEnv,
      ENVIRONMENT: 'test',
      ALLOW_TEST_MOCK_TOKEN: true,
    };

    // User A creates a project and task
    const createProjReq = new Request('http://localhost:8787/api/projects', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_token_user_a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Projeto Secreto A' }),
    });
    const projRes = await worker.fetch(createProjReq, devEnv);
    expect(projRes.status).toBe(201);
    const projData = (await projRes.json()) as any;
    const projAId = projData.id;

    const createTaskReq = new Request('http://localhost:8787/api/tasks', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock_token_user_a',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projAId,
        title: 'Tarefa confidencial de A',
        status: 'backlog',
      }),
    });
    const taskRes = await worker.fetch(createTaskReq, devEnv);
    expect(taskRes.status).toBe(201);
    const taskData = (await taskRes.json()) as any;
    const taskAId = taskData.id;

    // User B tries to read User A's task directly
    const accessReq = new Request(`http://localhost:8787/api/tasks/${taskAId}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock_token_user_b',
      },
    });
    const accessRes = await worker.fetch(accessReq, devEnv);
    expect(accessRes.status).toBe(404);

    // User B tries to modify User A's task
    const updateReq = new Request(`http://localhost:8787/api/tasks/${taskAId}`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer mock_token_user_b',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Hacked by B' }),
    });
    const updateRes = await worker.fetch(updateReq, devEnv);
    expect(updateRes.status).toBe(404);

    // User B tries to read User A's project
    const projAccessReq = new Request(`http://localhost:8787/api/projects/${projAId}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer mock_token_user_b',
      },
    });
    const projAccessRes = await worker.fetch(projAccessReq, devEnv);
    expect(projAccessRes.status).toBe(404);
  });

  it('should return CORS headers without wildcard in production', async () => {
    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/health', {
      headers: { Origin: 'https://todo-pro.botanstudio.workers.dev' },
    });
    const res = await worker.fetch(req, dummyEnv);
    const allowOrigin = res.headers.get('Access-Control-Allow-Origin');
    expect(allowOrigin).toBe('https://todo-pro.botanstudio.workers.dev');
    expect(allowOrigin).not.toBe('*');
  });
});

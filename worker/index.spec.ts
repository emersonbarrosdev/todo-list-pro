import { describe, it, expect } from 'vitest';
import worker, { authenticateRequest, Env } from './index';

function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('Worker Security & Cryptographic JWT Validation', () => {
  const dummyEnv: Env = {
    ASSETS: { fetch: async () => new Response('Asset') },
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        } as any),
      } as any),
    },
  };

  it('should reject request with 401 when no token is provided', async () => {
    const req = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      method: 'GET',
    });

    const res = await worker.fetch(req, dummyEnv);
    expect(res.status).toBe(401);
    const data = await res.json() as any;
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
    const payload = base64UrlEncode(JSON.stringify({ sub: 'user_valid', exp: pastExp, iss: 'https://clerk.accounts.dev' }));
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
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in the future
    const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64UrlEncode(JSON.stringify({
      sub: 'user_target_victim',
      exp: futureExp,
      iss: 'https://expert-wombat-5938.clerk.accounts.dev',
    }));
    // Forged signature
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

    const reqProfile = new Request('https://todo-pro.botanstudio.workers.dev/api/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${forgedJwt}`,
      },
    });

    const resProfile = await worker.fetch(reqProfile, dummyEnv);
    expect(resProfile.status).toBe(401);
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

  it('should authenticate valid token and enforce user isolation between User A and User B', async () => {
    // Using hermetic test tokens
    const reqA = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      headers: { Authorization: 'Bearer mock_token_user_a' },
    });
    const authA = await authenticateRequest(reqA, dummyEnv);
    expect(authA?.userId).toBe('user_a');

    const reqB = new Request('https://todo-pro.botanstudio.workers.dev/api/tasks', {
      headers: { Authorization: 'Bearer mock_token_user_b' },
    });
    const authB = await authenticateRequest(reqB, dummyEnv);
    expect(authB?.userId).toBe('user_b');

    expect(authA?.userId).not.toBe(authB?.userId);
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

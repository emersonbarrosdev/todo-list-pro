import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ApiClientOptions {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private auth = inject(AuthService);

  private get baseUrl(): string {
    return environment.apiUrl;
  }

  private logDev(method: string, endpoint: string): void {
    if (!environment.production && typeof console !== 'undefined') {
      console.log(`[API] ${method} ${endpoint}`);
    }
  }

  // Hermetic mock storage for unit tests ONLY when running in non-production with mock_token_
  private handleMockRequest<T>(method: string, endpoint: string, body?: any, token?: string): T {
    if (environment.production) {
      throw new Error('Ambiente de produção não permite simulação de backend.');
    }

    const userId = token?.replace('mock_token_', '') || 'guest';
    const storeKey = `todo_pro_mock_d1_tasks_${userId}`;
    const profileKey = `todo_pro_mock_d1_profile_${userId}`;
    const projectsKey = `todo_pro_mock_d1_projects_${userId}`;

    // Ensure default project exists in mock
    let projects: any[] = [];
    try {
      projects = JSON.parse(localStorage.getItem(projectsKey) || '[]');
    } catch {
      projects = [];
    }
    if (projects.length === 0) {
      const now = new Date().toISOString();
      projects = [
        {
          id: `proj_default_${userId}`,
          user_id: userId,
          name: 'Meu Projeto',
          description: 'Projeto inicial',
          archived: false,
          created_at: now,
          updated_at: now,
        },
      ];
      localStorage.setItem(projectsKey, JSON.stringify(projects));
    }

    // 1. Profile route
    if (endpoint === '/profile') {
      if (method === 'GET') {
        const stored = localStorage.getItem(profileKey);
        const now = new Date().toISOString();
        const profile = stored
          ? JSON.parse(stored)
          : { id: `prof_${userId}`, display_name: 'Usuário', created_at: now, updated_at: now };
        return profile as T;
      }
      if (method === 'PUT') {
        const existing = this.handleMockRequest<any>('GET', '/profile', undefined, token);
        const updated = { ...existing, ...(body || {}), updated_at: new Date().toISOString() };
        localStorage.setItem(profileKey, JSON.stringify(updated));
        return updated as T;
      }
    }

    // 2. Projects routes: /projects and /projects?archived=true
    if (endpoint === '/projects' || endpoint === '/projects?archived=true') {
      const includeArchived = endpoint.includes('archived=true');
      if (method === 'GET') {
        const list = includeArchived ? projects : projects.filter((p) => !p.archived);
        return list as T;
      }

      if (method === 'POST') {
        const now = new Date().toISOString();
        const newProj = {
          id: 'proj_' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          name: (body?.name || '').trim(),
          description: (body?.description || '').trim(),
          archived: false,
          created_at: now,
          updated_at: now,
        };
        projects.unshift(newProj);
        localStorage.setItem(projectsKey, JSON.stringify(projects));
        return newProj as T;
      }
    }

    const projectMatch = endpoint.match(/^\/projects\/([^/?]+)$/);
    if (projectMatch) {
      const projId = projectMatch[1];
      const index = projects.findIndex((p) => p.id === projId);

      if (method === 'GET') {
        if (index === -1) throw new Error('Projeto não encontrado.');
        return projects[index] as T;
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (index === -1) throw new Error('Projeto não encontrado.');
        const updated = {
          ...projects[index],
          ...(body || {}),
          updated_at: new Date().toISOString(),
        };
        projects[index] = updated;
        localStorage.setItem(projectsKey, JSON.stringify(projects));
        return updated as T;
      }
    }

    // 3. Collection route: /tasks
    if (endpoint.startsWith('/tasks')) {
      const stored = localStorage.getItem(storeKey);
      let tasks: any[] = stored ? JSON.parse(stored) : [];

      if (method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
        const projectId = urlParams.get('projectId');
        if (projectId) {
          tasks = tasks.filter((t) => t.project_id === projectId);
        }
        return tasks as T;
      }

      if (method === 'POST') {
        const now = new Date().toISOString();
        const newTask = {
          id: 'task_' + Math.random().toString(36).substring(2, 9),
          user_id: userId,
          project_id: body?.project_id || projects[0]?.id || `proj_default_${userId}`,
          title: (body?.title || '').trim(),
          description: body?.description || '',
          status: body?.status || 'backlog',
          priority: body?.priority || 'normal',
          due_at: body?.due_at || null,
          qa_checklist: body?.qa_checklist || [],
          qa_result: body?.qa_result || 'pending',
          qa_notes: body?.qa_notes || '',
          completed_at: body?.status === 'done' ? now : null,
          created_at: now,
          updated_at: now,
        };
        tasks.unshift(newTask);
        localStorage.setItem(storeKey, JSON.stringify(tasks));
        return newTask as T;
      }
    }

    // 4. Item route: /tasks/:id
    const taskMatch = endpoint.match(/^\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const taskId = taskMatch[1];
      const stored = localStorage.getItem(storeKey);
      const tasks: any[] = stored ? JSON.parse(stored) : [];
      const index = tasks.findIndex((t) => t.id === taskId);

      if (method === 'GET') {
        if (index === -1) throw new Error('Recurso não encontrado.');
        return tasks[index] as T;
      }

      if (method === 'PUT' || method === 'PATCH') {
        if (index === -1) throw new Error('Tarefa não encontrada ou permissão negada.');
        const now = new Date().toISOString();
        const existing = tasks[index];
        const status = body?.status !== undefined ? body.status : existing.status;
        const completed_at = status === 'done' ? existing.completed_at || now : status !== 'done' ? null : existing.completed_at;

        const updated = {
          ...existing,
          ...(body || {}),
          status,
          completed_at,
          updated_at: now,
        };
        tasks[index] = updated;
        localStorage.setItem(storeKey, JSON.stringify(tasks));
        return updated as T;
      }

      if (method === 'DELETE') {
        if (index === -1) throw new Error('Recurso não encontrado.');
        tasks.splice(index, 1);
        localStorage.setItem(storeKey, JSON.stringify(tasks));
        return { success: true } as T;
      }
    }

    throw new Error('Endpoint não encontrado.');
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: ApiClientOptions
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    this.logDev(method, cleanEndpoint);

    const token = options?.skipAuth ? null : await this.auth.getToken();

    // STRICT: In production, mock backend is NEVER permitted!
    if (environment.production) {
      if (!token && !options?.skipAuth) {
        throw new Error('Não autorizado ou sessão expirada. Faça login novamente.');
      }
    } else {
      // In development / test environment ONLY: allow mock when running offline tests
      if (!token || token.startsWith('mock_token_')) {
        if (typeof window === 'undefined' || this.baseUrl.startsWith('/') || token?.startsWith('mock_token_')) {
          return this.handleMockRequest<T>(method, cleanEndpoint, body, token || 'mock_token_guest');
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${cleanEndpoint}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error('Falha de conexão com o servidor. Verifique sua internet.');
    }

    if (res.status === 401) {
      throw new Error('Não autorizado ou sessão expirada. Faça login novamente.');
    }

    if (res.status === 429) {
      throw new Error('Limite gratuito de requisições atingido. Tente novamente mais tarde.');
    }

    if (res.status === 404) {
      throw new Error('Recurso não encontrado.');
    }

    if (!res.ok) {
      let errMsg = 'Erro ao processar a requisição no servidor.';
      try {
        const errorData = await res.json();
        if (errorData?.error && typeof errorData.error === 'string') {
          errMsg = errorData.error;
        }
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(errMsg);
    }

    return (await res.json()) as T;
  }

  get<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  post<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  put<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  patch<T>(endpoint: string, body?: unknown, options?: ApiClientOptions): Promise<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  delete<T>(endpoint: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

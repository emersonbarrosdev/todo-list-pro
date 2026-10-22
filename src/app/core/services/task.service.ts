import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Task, CreateTaskDto, UpdateTaskDto, WorkMode, TaskStatus, TaskPriority } from '../models/task.model';
import { environment } from '../../../environments/environment';

export interface TaskFilterOptions {
  status?: TaskStatus | 'all';
  workMode?: WorkMode | 'all';
  priority?: TaskPriority | 'all';
  searchQuery?: string;
  sortBy?: 'recent' | 'oldest' | 'due_date' | 'priority';
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private auth = inject(AuthService);

  private get storageKey(): string {
    const user = this.auth.currentUser();
    return `todo_pro_tasks_${user?.id || 'guest'}`;
  }

  private loadLocalTasks(): Task[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveLocalTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }

  async getTasks(filters?: TaskFilterOptions): Promise<Task[]> {
    const token = await this.auth.getToken();

    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const queryParams = new URLSearchParams();
        if (filters?.status && filters.status !== 'all') queryParams.set('status', filters.status);
        if (filters?.workMode && filters.workMode !== 'all') queryParams.set('workMode', filters.workMode);
        if (filters?.priority && filters.priority !== 'all') queryParams.set('priority', filters.priority);
        if (filters?.sortBy) queryParams.set('sortBy', filters.sortBy);
        if (filters?.searchQuery) queryParams.set('q', filters.searchQuery);

        const url = `${environment.apiUrl}/tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const tasks: Task[] = await res.json();
          this.saveLocalTasks(tasks);
          return this.applyFilters(tasks, filters);
        }
      } catch {
        // Fall back to local storage
      }
    }

    const localTasks = this.loadLocalTasks();
    return this.applyFilters(localTasks, filters);
  }

  async getTaskById(id: string): Promise<Task | null> {
    const token = await this.auth.getToken();

    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const res = await fetch(`${environment.apiUrl}/tasks/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fall back to local
      }
    }

    return this.loadLocalTasks().find((t) => t.id === id) || null;
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const user = this.auth.currentUser();
    const now = new Date().toISOString();

    const localRecord: Task = {
      id: 'task_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      user_id: user?.id || 'guest',
      title: dto.title.trim(),
      description: dto.description || '',
      status: dto.status || 'todo',
      priority: dto.priority || 'normal',
      due_at: dto.due_at || null,
      tags: dto.tags || [],
      checklist: dto.checklist || [],
      work_mode: dto.work_mode || 'general',
      metadata: dto.metadata || {},
      completed_at: dto.status === 'done' ? now : null,
      created_at: now,
      updated_at: now,
    };

    const token = await this.auth.getToken();

    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const res = await fetch(`${environment.apiUrl}/tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dto),
        });

        if (res.ok) {
          const created: Task = await res.json();
          const current = this.loadLocalTasks().filter((t) => t.id !== created.id);
          this.saveLocalTasks([created, ...current]);
          return created;
        } else if (res.status === 429) {
          throw new Error('Limite gratuito de requisições atingido. Tente novamente mais tarde.');
        }
      } catch (err: any) {
        if (err.message?.includes('Limite')) throw err;
        // Fall back to local creation
      }
    }

    const current = this.loadLocalTasks();
    this.saveLocalTasks([localRecord, ...current]);
    return localRecord;
  }

  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    const now = new Date().toISOString();
    const payload: Partial<Task> = { ...updates, updated_at: now };

    if (updates.status === 'done' && updates.completed_at === undefined) {
      payload.completed_at = now;
    } else if (updates.status && updates.status !== 'done') {
      payload.completed_at = null;
    }

    const token = await this.auth.getToken();

    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const res = await fetch(`${environment.apiUrl}/tasks/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const updated: Task = await res.json();
          const tasks = this.loadLocalTasks().map((t) => (t.id === id ? updated : t));
          this.saveLocalTasks(tasks);
          return updated;
        } else if (res.status === 404) {
          throw new Error('Tarefa não encontrada.');
        } else if (res.status === 429) {
          throw new Error('Limite gratuito de requisições atingido. Tente novamente mais tarde.');
        }
      } catch (err: any) {
        if (err.message?.includes('Tarefa') || err.message?.includes('Limite')) throw err;
        // Fall back to local update
      }
    }

    const tasks = this.loadLocalTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error('Tarefa não encontrada ou permissão negada.');
    }

    const updated = { ...tasks[index], ...payload };
    tasks[index] = updated;
    this.saveLocalTasks(tasks);
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const token = await this.auth.getToken();

    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const res = await fetch(`${environment.apiUrl}/tasks/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok && res.status !== 404) {
          if (res.status === 429) {
            throw new Error('Limite gratuito atingido. Tente novamente mais tarde.');
          }
        }
      } catch (err: any) {
        if (err.message?.includes('Limite')) throw err;
        // continue local removal
      }
    }

    const tasks = this.loadLocalTasks().filter((t) => t.id !== id);
    this.saveLocalTasks(tasks);
  }

  applyFilters(tasks: Task[], filters?: TaskFilterOptions): Task[] {
    let result = [...tasks];

    if (!filters) return result;

    if (filters.status && filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }

    if (filters.workMode && filters.workMode !== 'all') {
      result = result.filter((t) => t.work_mode === filters.workMode);
    }

    if (filters.priority && filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    if (filters.sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (filters.sortBy === 'due_date') {
      result.sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
    } else if (filters.sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { high: 3, normal: 2, low: 1 };
      result.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }
}

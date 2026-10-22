import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Task, CreateTaskDto, UpdateTaskDto, WorkMode, TaskStatus, TaskPriority } from '../models/task.model';

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
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private get mockStorageKey(): string {
    const user = this.auth.currentUser();
    return `todo_pro_tasks_${user?.id || 'guest'}`;
  }

  private loadMockTasks(): Task[] {
    const stored = localStorage.getItem(this.mockStorageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  private saveMockTasks(tasks: Task[]) {
    localStorage.setItem(this.mockStorageKey, JSON.stringify(tasks));
  }

  async getTasks(filters?: TaskFilterOptions): Promise<Task[]> {
    const client = this.supabase.getClient();
    const user = this.auth.currentUser();

    if (!this.supabase.isConfigured || !client || !user) {
      let tasks = this.loadMockTasks();
      return this.applyFilters(tasks, filters);
    }

    let query = client
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.workMode && filters.workMode !== 'all') {
      query = query.eq('work_mode', filters.workMode);
    }

    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (filters?.sortBy === 'due_date') {
      query = query.order('due_at', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Erro ao buscar tarefas: ${error.message}`);
    }

    let result = (data || []) as Task[];
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    return result;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const client = this.supabase.getClient();
    const user = this.auth.currentUser();

    if (!this.supabase.isConfigured || !client || !user) {
      return this.loadMockTasks().find((t) => t.id === id) || null;
    }

    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar tarefa: ${error.message}`);
    }

    return data as Task | null;
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const client = this.supabase.getClient();
    const user = this.auth.currentUser();
    const now = new Date().toISOString();

    const record: Partial<Task> = {
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
    };

    if (!this.supabase.isConfigured || !client || !user) {
      const newTask: Task = {
        id: 'task_' + Math.random().toString(36).substring(2, 9),
        user_id: user?.id || 'mock-user-1',
        title: record.title!,
        description: record.description!,
        status: record.status!,
        priority: record.priority!,
        due_at: record.due_at ?? null,
        tags: record.tags!,
        checklist: record.checklist!,
        work_mode: record.work_mode!,
        metadata: record.metadata!,
        completed_at: record.completed_at ?? null,
        created_at: now,
        updated_at: now,
      };

      const tasks = [newTask, ...this.loadMockTasks()];
      this.saveMockTasks(tasks);
      return newTask;
    }

    const { data, error } = await client
      .from('tasks')
      .insert({
        ...record,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar tarefa: ${error.message}`);
    }

    return data as Task;
  }

  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    const client = this.supabase.getClient();
    const user = this.auth.currentUser();
    const now = new Date().toISOString();

    const payload: Partial<Task> = { ...updates, updated_at: now };
    if (updates.status === 'done' && updates.completed_at === undefined) {
      payload.completed_at = now;
    } else if (updates.status && updates.status !== 'done') {
      payload.completed_at = null;
    }

    if (!this.supabase.isConfigured || !client || !user) {
      const tasks = this.loadMockTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        throw new Error('Tarefa não encontrada');
      }
      const updated = { ...tasks[index], ...payload };
      tasks[index] = updated;
      this.saveMockTasks(tasks);
      return updated;
    }

    const { data, error } = await client
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar tarefa: ${error.message}`);
    }

    return data as Task;
  }

  async deleteTask(id: string): Promise<void> {
    const client = this.supabase.getClient();
    const user = this.auth.currentUser();

    if (!this.supabase.isConfigured || !client || !user) {
      const tasks = this.loadMockTasks().filter((t) => t.id !== id);
      this.saveMockTasks(tasks);
      return;
    }

    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Erro ao remover tarefa: ${error.message}`);
    }
  }

  private applyFilters(tasks: Task[], filters?: TaskFilterOptions): Task[] {
    let result = [...tasks];

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }
    if (filters?.workMode && filters.workMode !== 'all') {
      result = result.filter((t) => t.work_mode === filters.workMode);
    }
    if (filters?.priority && filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    if (filters?.sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (filters?.sortBy === 'due_date') {
      result.sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
    } else if (filters?.sortBy === 'priority') {
      const weight: Record<TaskPriority, number> = { high: 3, normal: 2, low: 1 };
      result.sort((a, b) => weight[b.priority] - weight[a.priority]);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }
}

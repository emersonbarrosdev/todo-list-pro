import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Task, CreateTaskDto, UpdateTaskDto, TaskStatus, TaskPriority } from '../models/task.model';

export interface TaskFilterOptions {
  project?: string;
  projectId?: string;
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  searchQuery?: string;
  sortBy?: 'recent' | 'oldest' | 'due_date' | 'priority';
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private api = inject(ApiClientService);

  /**
   * Loads user tasks from D1 through Worker API.
   * Executed once on initial load, never on filter/search/sort.
   */
  async getTasks(project?: string): Promise<Task[]> {
    const endpoint = '/tasks';
    return this.api.get<Task[]>(endpoint);
  }

  async getTaskById(id: string): Promise<Task> {
    return this.api.get<Task>(`/tasks/${id}`);
  }

  /**
   * Persists a newly created task directly in D1.
   * Triggered ONLY when the user explicitly clicks 'Criar tarefa'.
   */
  async createTask(dto: CreateTaskDto): Promise<Task> {
    return this.api.post<Task>('/tasks', dto);
  }

  /**
   * Persists the entire task state into D1 with a single PUT call.
   * Triggered ONLY when the user clicks 'Salvar', workflow action buttons, or uses Ctrl+S / Cmd+S.
   */
  async updateTask(id: string, updates: UpdateTaskDto): Promise<Task> {
    return this.api.put<Task>(`/tasks/${id}`, updates);
  }

  /**
   * Permanently deletes a task from D1 upon explicit user confirmation.
   */
  async deleteTask(id: string): Promise<void> {
    await this.api.delete(`/tasks/${id}`);
  }

  /**
   * Pure client-side filter and sort in memory.
   * Zero HTTP calls when user switches filters, sorts or searches.
   */
  applyFilters(tasks: Task[], filters?: TaskFilterOptions): Task[] {
    let result = [...tasks];

    if (!filters) return result;

    if (filters.project && filters.project !== 'all') {
      result = result.filter(
        (t) => (t.project || '').toLowerCase().trim() === filters.project!.toLowerCase().trim()
      );
    } else if (filters.projectId && filters.projectId !== 'all') {
      result = result.filter(
        (t) => (t.project || t.project_id || '').toLowerCase().trim() === filters.projectId!.toLowerCase().trim()
      );
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'in_progress' || (filters.status as any) === 'doing') {
        result = result.filter((t) => t.status === 'in_progress' || (t.status as any) === 'doing');
      } else if (filters.status === 'qa' || (filters.status as any) === 'ready_for_test') {
        result = result.filter((t) => t.status === 'qa' || (t.status as any) === 'ready_for_test');
      } else {
        result = result.filter((t) => t.status === filters.status);
      }
    }

    if (filters.priority && filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.project && t.project.toLowerCase().includes(q)) ||
          (t.qa_notes && t.qa_notes.toLowerCase().includes(q))
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
      // Default: recent
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }
}

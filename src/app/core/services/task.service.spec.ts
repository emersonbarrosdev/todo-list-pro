import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [TaskService, AuthService, SupabaseService],
    });
    service = TestBed.inject(TaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create and retrieve tasks', async () => {
    const created = await service.createTask({
      title: 'Tarefa de Teste',
      description: 'Descrição de teste',
      priority: 'high',
      work_mode: 'dev',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Tarefa de Teste');
    expect(created.status).toBe('todo');

    const tasks = await service.getTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(created.id);
  });

  it('should update task status and completion date', async () => {
    const created = await service.createTask({
      title: 'Concluir tarefa',
      status: 'todo',
    });

    const updated = await service.updateTask(created.id, {
      status: 'done',
    });

    expect(updated.status).toBe('done');
    expect(updated.completed_at).toBeTruthy();
  });

  it('should delete task', async () => {
    const created = await service.createTask({
      title: 'Remover tarefa',
    });

    await service.deleteTask(created.id);
    const tasks = await service.getTasks();
    expect(tasks.find((t) => t.id === created.id)).toBeUndefined();
  });
});

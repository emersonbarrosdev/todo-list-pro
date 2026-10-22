import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { ApiClientService } from './api-client.service';
import { AuthService } from './auth.service';
import { ClerkService } from '../auth/clerk.service';

describe('TaskService', () => {
  let service: TaskService;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [TaskService, ApiClientService, AuthService, ClerkService],
    });
    service = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);
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

  it('should enforce user data isolation so User A cannot access User B tasks', async () => {
    // 1. Authenticate as User A
    await authService.signIn('usera@todopro.com');
    await authService.verifyCode('123456');
    const userA = authService.currentUser();
    expect(userA).toBeTruthy();

    const taskA = await service.createTask({
      title: 'Tarefa Privada do Usuário A',
      work_mode: 'general',
    });

    const tasksUserA = await service.getTasks();
    expect(tasksUserA.some((t) => t.id === taskA.id)).toBe(true);

    // 2. Sign out and authenticate as User B
    await authService.signOut();
    await authService.signIn('userb@todopro.com');
    await authService.verifyCode('654321');
    const userB = authService.currentUser();
    expect(userB).toBeTruthy();
    expect(userB?.id).not.toBe(userA?.id);

    // 3. User B should NOT see User A's task
    const tasksUserB = await service.getTasks();
    expect(tasksUserB.some((t) => t.id === taskA.id)).toBe(false);

    // 4. User B cannot update User A's task
    await expect(service.updateTask(taskA.id, { title: 'Hack' })).rejects.toThrow();
  });

  it('should filter tasks purely client-side without calling API', async () => {
    const t1 = await service.createTask({ title: 'Task Dev High', work_mode: 'dev', priority: 'high' });
    const t2 = await service.createTask({ title: 'Task QA Normal', work_mode: 'qa', priority: 'normal' });
    const t3 = await service.createTask({ title: 'Task General Low', work_mode: 'general', priority: 'low' });

    const all = [t1, t2, t3];

    // Client-side work mode filter
    const devTasks = service.applyFilters(all, { workMode: 'dev' });
    expect(devTasks.length).toBe(1);
    expect(devTasks[0].title).toBe('Task Dev High');

    // Client-side priority filter
    const highTasks = service.applyFilters(all, { priority: 'high' });
    expect(highTasks.length).toBe(1);
    expect(highTasks[0].title).toBe('Task Dev High');

    // Client-side search
    const searchTasks = service.applyFilters(all, { searchQuery: 'General' });
    expect(searchTasks.length).toBe(1);
    expect(searchTasks[0].title).toBe('Task General Low');
  });

  it('should sort tasks correctly purely client-side', async () => {
    const t1 = await service.createTask({ title: 'Primeira', priority: 'low' });
    const t2 = await service.createTask({ title: 'Segunda', priority: 'high' });

    const sortedByPriority = service.applyFilters([t1, t2], { sortBy: 'priority' });
    expect(sortedByPriority[0].id).toBe(t2.id); // high before low
  });
});

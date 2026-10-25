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

  it('should create and retrieve tasks with simplified model', async () => {
    const created = await service.createTask({
      project_id: 'proj_default_guest',
      title: 'Tarefa de Teste',
      description: 'Descrição de teste',
      priority: 'high',
      status: 'backlog',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Tarefa de Teste');
    expect(created.status).toBe('backlog');

    const tasks = await service.getTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(created.id);
  });

  it('should update task status and QA validation details', async () => {
    const created = await service.createTask({
      project_id: 'proj_default_guest',
      title: 'Validar exportação',
      status: 'backlog',
    });

    const readyForTest = await service.updateTask(created.id, {
      status: 'ready_for_test',
      qa_checklist: [{ id: '1', text: 'Exporta em 2K', completed: true }],
      qa_result: 'approved',
      qa_notes: 'Validado com sucesso',
    });

    expect(readyForTest.status).toBe('ready_for_test');
    expect(readyForTest.qa_result).toBe('approved');
    expect(readyForTest.qa_notes).toBe('Validado com sucesso');

    const completed = await service.updateTask(created.id, {
      status: 'done',
    });
    expect(completed.status).toBe('done');
    expect(completed.completed_at).toBeTruthy();
  });

  it('should delete task', async () => {
    const created = await service.createTask({
      project_id: 'proj_default_guest',
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
      project_id: 'proj_user_a',
      title: 'Tarefa Privada do Usuário A',
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
    const t1 = await service.createTask({ project_id: 'p1', title: 'Task Backlog High', priority: 'high', status: 'backlog' });
    const t2 = await service.createTask({ project_id: 'p1', title: 'Task QA Normal', priority: 'normal', status: 'ready_for_test' });
    const t3 = await service.createTask({ project_id: 'p2', title: 'Task Other Project', priority: 'low', status: 'done' });

    const all = [t1, t2, t3];

    // Client-side project filter
    const p1Tasks = service.applyFilters(all, { projectId: 'p1' });
    expect(p1Tasks.length).toBe(2);

    // Client-side status filter
    const testTasks = service.applyFilters(all, { status: 'ready_for_test' });
    expect(testTasks.length).toBe(1);
    expect(testTasks[0].title).toBe('Task QA Normal');

    // Client-side priority filter
    const highTasks = service.applyFilters(all, { priority: 'high' });
    expect(highTasks.length).toBe(1);
    expect(highTasks[0].title).toBe('Task Backlog High');

    // Client-side search
    const searchTasks = service.applyFilters(all, { searchQuery: 'Other' });
    expect(searchTasks.length).toBe(1);
    expect(searchTasks[0].title).toBe('Task Other Project');
  });

  it('should sort tasks correctly purely client-side', async () => {
    const t1 = await service.createTask({ project_id: 'p1', title: 'Primeira', priority: 'low' });
    const t2 = await service.createTask({ project_id: 'p1', title: 'Segunda', priority: 'high' });

    const sortedByPriority = service.applyFilters([t1, t2], { sortBy: 'priority' });
    expect(sortedByPriority[0].id).toBe(t2.id); // high before low
  });
});

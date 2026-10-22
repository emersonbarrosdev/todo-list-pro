import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TasksComponent } from './tasks.component';
import { TaskService } from '../../core/services/task.service';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { ClerkService } from '../../core/auth/clerk.service';
import { Task } from '../../core/models/task.model';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let taskService: TaskService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        provideRouter([]),
        TaskService,
        ApiClientService,
        AuthService,
        ClerkService,
        ProfileService,
        ToastService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    taskService = TestBed.inject(TaskService);
    fixture.detectChanges();
  });

  it('should create TasksComponent and load initial empty tasks', () => {
    expect(component).toBeTruthy();
    expect(component.tasks().length).toBe(0);
  });

  it('should open empty local form on new task without writing to server', () => {
    component.openNewTaskModal();
    expect(component.isNewTask()).toBe(true);
    expect(component.selectedTask()).toBeTruthy();
    expect(component.selectedTask()?.title).toBe('');
    // Server tasks still 0: 0 writes!
    expect(component.tasks().length).toBe(0);
  });

  it('should create task in server only when explicitly saved', async () => {
    component.openNewTaskModal();

    await component.handleTaskSaved({
      title: 'Tarefa salva manualmente',
      work_mode: 'general',
    });

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].title).toBe('Tarefa salva manualmente');
    expect(component.isNewTask()).toBe(false);
    expect(component.selectedTask()).toBeNull();
  });

  it('should filter tasks purely client-side without re-fetching from API', async () => {
    const t1: Task = {
      id: 'task-1',
      user_id: 'user',
      title: 'Tarefa A Fazer',
      description: '',
      status: 'todo',
      priority: 'normal',
      due_at: null,
      tags: [],
      checklist: [],
      work_mode: 'general',
      metadata: {},
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const t2: Task = {
      ...t1,
      id: 'task-2',
      title: 'Tarefa Feita',
      status: 'done',
    };

    component.tasks.set([t1, t2]);

    // Initial: all 2
    expect(component.filteredTasks().length).toBe(2);

    // Filter 'done' in memory
    component.setStatusFilter('done');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-2');

    // Filter 'todo' in memory
    component.setStatusFilter('todo');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-1');
  });

  it('should search tasks purely client-side without re-fetching from API', () => {
    const t1: Task = {
      id: 'task-1',
      user_id: 'user',
      title: 'Documentar autenticação Clerk',
      description: '',
      status: 'todo',
      priority: 'normal',
      due_at: null,
      tags: ['auth'],
      checklist: [],
      work_mode: 'dev',
      metadata: {},
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const t2: Task = {
      ...t1,
      id: 'task-2',
      title: 'Comprar frutas',
      tags: [],
    };

    component.tasks.set([t1, t2]);

    component.onSearchChange('Clerk');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-1');

    component.onSearchChange('frutas');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-2');
  });

  it('should delete task with confirmation', async () => {
    const created = await taskService.createTask({ title: 'Para deletar' });
    component.tasks.set([created]);

    // Mock confirm dialog
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await component.handleDeleteTask(created);
    expect(component.tasks().length).toBe(0);

    confirmSpy.mockRestore();
  });
});

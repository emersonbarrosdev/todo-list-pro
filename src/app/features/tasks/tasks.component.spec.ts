import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TasksComponent } from './tasks.component';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';

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
        AuthService,
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

  it('should create task optimistically and persist', async () => {
    component.quickAddForm.controls['title'].setValue('Comprar café especial');
    await component.handleCreateTask();

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].title).toBe('Comprar café especial');
  });

  it('should filter tasks by status', async () => {
    component.quickAddForm.controls['title'].setValue('Tarefa Pendente');
    await component.handleCreateTask();

    component.quickAddForm.controls['title'].setValue('Tarefa Feita');
    await component.handleCreateTask();

    const taskFeita = component.tasks()[0];
    await taskService.updateTask(taskFeita.id, { status: 'done' });

    component.setStatusFilter('done');
    await component.loadTasks();

    expect(component.tasks().every((t) => t.status === 'done')).toBe(true);
  });

  it('should filter tasks by search query', async () => {
    component.quickAddForm.controls['title'].setValue('Documentar API');
    await component.handleCreateTask();

    component.quickAddForm.controls['title'].setValue('Comprar leite');
    await component.handleCreateTask();

    component.onSearchChange('Documentar');
    await component.loadTasks();

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].title).toBe('Documentar API');
  });

  it('should handle Escape key to close selected task panel', () => {
    component.selectedTask.set({
      id: 'task-1',
      user_id: 'user-1',
      title: 'Tarefa Teste',
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
    });

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleGlobalShortcuts(event);

    expect(component.selectedTask()).toBeNull();
  });

  it('should optimistically delete task with undo option', async () => {
    component.quickAddForm.controls['title'].setValue('Tarefa para deletar');
    await component.handleCreateTask();
    expect(component.tasks().length).toBe(1);

    const taskToDelete = component.tasks()[0];
    await component.handleDeleteTask(taskToDelete);

    // Optimistically removed
    expect(component.tasks().length).toBe(0);
  });
});

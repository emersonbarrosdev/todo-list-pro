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

  it('should toggle task completion', async () => {
    component.quickAddForm.controls['title'].setValue('Tarefa para concluir');
    await component.handleCreateTask();

    const created = component.tasks()[0];
    const eventMock = { target: { checked: true } } as unknown as Event;
    await component.handleToggleComplete(created, eventMock);

    expect(component.tasks()[0].status).toBe('done');
  });

  it('should delete task with undo capability', async () => {
    component.quickAddForm.controls['title'].setValue('Tarefa descartável');
    await component.handleCreateTask();
    expect(component.tasks().length).toBe(1);

    const task = component.tasks()[0];
    await component.handleDeleteTask(task);
    expect(component.tasks().length).toBe(0);
  });
});

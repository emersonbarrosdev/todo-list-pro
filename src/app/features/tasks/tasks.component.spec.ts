import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TasksComponent } from './tasks.component';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
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
  let projectService: ProjectService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        provideRouter([]),
        TaskService,
        ProjectService,
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
    projectService = TestBed.inject(ProjectService);
    fixture.detectChanges();
  });

  it('should create TasksComponent and load initial projects', async () => {
    expect(component).toBeTruthy();
    await component.loadInitialData();
    expect(component.projects().length).toBeGreaterThanOrEqual(1);
  });

  it('should ensure workspace top bar has only Atualizar and NO duplicate "+ Nova tarefa" button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const topBarActions = compiled.querySelector('.top-bar-actions');
    expect(topBarActions?.querySelector('#btn-refresh-tasks')).toBeTruthy();
    // Verify no button with "+ Nova tarefa" inside the top-bar-actions
    const actionButtons = topBarActions?.querySelectorAll('button');
    expect(actionButtons?.length).toBe(1);
    expect(actionButtons?.[0]?.id).toBe('btn-refresh-tasks');
  });

  it('should filter tasks purely client-side without re-fetching from API', () => {
    const t1: Task = {
      id: 'task-1',
      project_id: 'p1',
      user_id: 'user',
      title: 'Tarefa no Backlog',
      description: '',
      status: 'backlog',
      priority: 'normal',
      due_at: null,
      qa_checklist: [],
      qa_result: 'pending',
      qa_notes: '',
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const t2: Task = {
      ...t1,
      id: 'task-2',
      title: 'Tarefa em Teste',
      status: 'ready_for_test',
    };
    const t3: Task = {
      ...t1,
      id: 'task-3',
      title: 'Tarefa Concluída',
      status: 'done',
    };

    component.selectedProjectId.set('all');
    component.setStatusFilter('all');
    component.allTasks.set([t1, t2, t3]);

    // When statusFilter is 'all': all 3
    expect(component.filteredTasks().length).toBe(3);

    // Filter 'ready_for_test' in memory
    component.setStatusFilter('ready_for_test');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-2');

    // Filter 'backlog' in memory
    component.setStatusFilter('backlog');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-1');
  });

  it('should search tasks purely client-side without re-fetching from API', () => {
    const t1: Task = {
      id: 'task-1',
      project_id: 'p1',
      user_id: 'user',
      title: 'Corrigir Kokoro',
      description: 'Pipeline de narração',
      status: 'backlog',
      priority: 'normal',
      due_at: null,
      qa_checklist: [],
      qa_result: 'pending',
      qa_notes: '',
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const t2: Task = {
      ...t1,
      id: 'task-2',
      title: 'Integrar Qwen local',
      description: '',
    };

    component.selectedProjectId.set('all');
    component.allTasks.set([t1, t2]);

    component.onSearchChange('Kokoro');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-1');

    component.onSearchChange('narração');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-1');

    component.onSearchChange('Qwen');
    expect(component.filteredTasks().length).toBe(1);
    expect(component.filteredTasks()[0].id).toBe('task-2');
  });

  it('should save task only when handleSaveTask is called', async () => {
    component.openNewTaskModal();
    expect(component.isCreatingTask()).toBe(true);

    await component.handleSaveTask({
      project_id: 'p1',
      title: 'Nova tarefa salva manualmente',
      status: 'backlog',
    });

    expect(component.allTasks().length).toBe(1);
    expect(component.allTasks()[0].title).toBe('Nova tarefa salva manualmente');
    expect(component.isCreatingTask()).toBe(false);
  });
});

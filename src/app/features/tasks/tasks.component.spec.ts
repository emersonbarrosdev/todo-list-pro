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

  it('should accurately calculate counters and not consider backlog tasks as doing or active', () => {
    const makeTask = (id: string, status: any): Task => ({
      id,
      user_id: 'u1',
      project: 'Projeto Teste',
      title: `Tarefa ${id}`,
      description: '',
      status,
      priority: 'high',
      due_at: null,
      qa_checklist: [],
      qa_result: 'not_started',
      qa_notes: '',
      images: [],
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 5 backlog, 2 doing/in_progress, 1 qa, 3 done = 11 total
    component.allTasks.set([
      makeTask('1', 'backlog'),
      makeTask('2', 'backlog'),
      makeTask('3', 'backlog'),
      makeTask('4', 'backlog'),
      makeTask('5', 'backlog'),
      makeTask('6', 'in_progress'),
      makeTask('7', 'doing'),
      makeTask('8', 'qa'),
      makeTask('9', 'done'),
      makeTask('10', 'done'),
      makeTask('11', 'done'),
    ]);

    expect(component.backlogCount()).toBe(5);
    expect(component.doingCount()).toBe(2);
    expect(component.qaCount()).toBe(1);
    expect(component.doneCount()).toBe(3);
    expect(component.totalCount()).toBe(11);
  });

  it('should validate complete lifecycle transitions across Scenarios 1 to 5', async () => {
    const makeTask = (id: string, status: any): Task => ({
      id,
      user_id: 'u1',
      project: 'Frontend',
      title: `Tarefa ${id}`,
      description: '',
      status,
      priority: 'normal',
      due_at: null,
      qa_checklist: [],
      qa_result: 'not_started',
      qa_notes: '',
      images: [],
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // CENÁRIO 1: 3 tarefas no Backlog
    component.allTasks.set([
      makeTask('t1', 'backlog'),
      makeTask('t2', 'backlog'),
      makeTask('t3', 'backlog'),
    ]);
    fixture.detectChanges();

    expect(component.backlogCount()).toBe(3);
    expect(component.doingCount()).toBe(0);
    expect(component.qaCount()).toBe(0);
    expect(component.doneCount()).toBe(0);
    expect(component.totalCount()).toBe(3);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.summary-backlog')?.textContent).toContain('3');
    expect(compiled.querySelector('.summary-backlog')?.textContent).toContain('não iniciadas');
    expect(compiled.querySelector('.summary-doing')?.textContent).toContain('0');
    expect(compiled.querySelector('.summary-doing')?.textContent).toContain('em andamento');

    // CENÁRIO 2: Iniciar uma tarefa (t1 moves to in_progress)
    component.allTasks.update((list) =>
      list.map((t) => (t.id === 't1' ? { ...t, status: 'in_progress' } : t))
    );
    fixture.detectChanges();

    expect(component.backlogCount()).toBe(2);
    expect(component.doingCount()).toBe(1);
    expect(component.qaCount()).toBe(0);
    expect(component.doneCount()).toBe(0);
    expect(component.totalCount()).toBe(3);

    // CENÁRIO 3: Enviar a tarefa em Doing para QA (t1 moves to qa)
    component.allTasks.update((list) =>
      list.map((t) => (t.id === 't1' ? { ...t, status: 'qa' } : t))
    );
    fixture.detectChanges();

    expect(component.backlogCount()).toBe(2);
    expect(component.doingCount()).toBe(0);
    expect(component.qaCount()).toBe(1);
    expect(component.doneCount()).toBe(0);
    expect(component.totalCount()).toBe(3);

    // CENÁRIO 4: Concluir a tarefa de QA (t1 moves to done)
    component.allTasks.update((list) =>
      list.map((t) => (t.id === 't1' ? { ...t, status: 'done' } : t))
    );
    fixture.detectChanges();

    expect(component.backlogCount()).toBe(2);
    expect(component.doingCount()).toBe(0);
    expect(component.qaCount()).toBe(0);
    expect(component.doneCount()).toBe(1);
    expect(component.totalCount()).toBe(3);

    // CENÁRIO 5: Selecionar a aba Backlog
    component.setStatusFilter('backlog');
    fixture.detectChanges();

    // Apenas as 2 tarefas de backlog aparecem na lista filtrada
    expect(component.filteredTasks().length).toBe(2);
    expect(component.filteredTasks().every((t) => t.status === 'backlog')).toBe(true);

    // Mas os badges continuam representando a contagem global!
    expect(component.backlogCount()).toBe(2);
    expect(component.doingCount()).toBe(0);
    expect(component.qaCount()).toBe(0);
    expect(component.doneCount()).toBe(1);
    expect(component.totalCount()).toBe(3);
  });

  it('should render task row items with action strictly on the rightmost position', () => {
    const t: Task = {
      id: 'row-test',
      user_id: 'u1',
      project: 'Frontend',
      title: 'Implementar login',
      description: '',
      status: 'backlog',
      priority: 'high',
      due_at: null,
      qa_checklist: [],
      qa_result: 'not_started',
      qa_notes: '',
      images: [],
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    component.isLoading.set(false);
    component.setStatusFilter('all');
    component.allTasks.set([t]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const taskRow = compiled.querySelector('.task-row');
    expect(taskRow).toBeTruthy();

    const taskRight = taskRow?.querySelector('.task-right');
    expect(taskRight).toBeTruthy();

    // Verify child order in task-right: Tag -> Priority -> Action
    const cells = taskRight?.querySelectorAll('.task-meta-cell');
    expect(cells?.length).toBeGreaterThanOrEqual(3);

    // First cell is Tag
    expect(cells?.[0].classList.contains('task-meta-tag')).toBe(true);
    expect(cells?.[0].textContent).toContain('Frontend');

    // Second cell is Priority
    expect(cells?.[1].classList.contains('task-meta-priority')).toBe(true);
    expect(cells?.[1].textContent).toContain('Alta');

    // Last cell is Action
    const lastCell = cells?.[cells.length - 1];
    expect(lastCell?.classList.contains('task-meta-action')).toBe(true);
    expect(lastCell?.querySelector('.btn-card-start')).toBeTruthy();
    expect(lastCell?.textContent).toContain('Iniciar');
  });

  it('should track isSavingTask state during handleSaveTask', async () => {
    expect(component.isSavingTask()).toBe(false);

    let resolveSave: () => void;
    const savePromise = new Promise<Task>((resolve) => {
      resolveSave = () =>
        resolve({
          id: 'created-task',
          user_id: 'u',
          project: 'P',
          title: 'Nova Tarefa Com Loading',
          description: '',
          status: 'backlog',
          priority: 'normal',
          due_at: null,
          qa_checklist: [],
          qa_result: 'not_started',
          qa_notes: '',
          images: [],
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    });

    vi.spyOn(taskService, 'createTask').mockImplementation(() => savePromise);

    component.openNewTaskModal();
    const handlePromise = component.handleSaveTask({ title: 'Nova Tarefa Com Loading' });

    // While promise is in flight, isSavingTask should be true
    expect(component.isSavingTask()).toBe(true);

    resolveSave!();
    await handlePromise;

    // After completion, isSavingTask returns to false
    expect(component.isSavingTask()).toBe(false);
    expect(component.allTasks().length).toBe(1);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskDetailsComponent } from './task-details.component';
import { Task } from '../../../core/models/task.model';

describe('TaskDetailsComponent', () => {
  let component: TaskDetailsComponent;
  let fixture: ComponentFixture<TaskDetailsComponent>;

  const mockTask: Task = {
    id: 'test-1',
    user_id: 'user-1',
    title: 'Tarefa detalhada',
    description: 'Notas de descrição',
    status: 'todo',
    priority: 'normal',
    due_at: null,
    tags: ['design'],
    checklist: [{ id: 'c1', text: 'Subitem 1', completed: false }],
    work_mode: 'general',
    metadata: {},
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailsComponent);
    component = fixture.componentInstance;
    component.task = mockTask;
    fixture.detectChanges();
  });

  it('should create and load initial task properties', () => {
    expect(component).toBeTruthy();
    expect(component.title).toBe('Tarefa detalhada');
    expect(component.status).toBe('todo');
    expect(component.priority).toBe('normal');
    expect(component.workMode).toBe('general');
  });

  it('should toggle and support developer work mode fields', () => {
    component.setWorkMode('dev');
    expect(component.workMode).toBe('dev');

    component.devType = 'Bug';
    component.devBranch = 'fix/login-issue';
    component.devProject = 'Auth Service';
    expect(component.devType).toBe('Bug');
    expect(component.devBranch).toBe('fix/login-issue');
  });

  it('should toggle and support QA work mode fields', () => {
    component.setWorkMode('qa');
    expect(component.workMode).toBe('qa');

    component.qaType = 'Regressão';
    component.qaSeverity = 'Crítica';
    component.qaSteps = '1. Clicar em checkout\n2. Erro 500';
    component.qaExpected = 'Compra confirmada';
    component.qaActual = 'Erro 500';

    expect(component.qaType).toBe('Regressão');
    expect(component.qaSeverity).toBe('Crítica');
  });

  it('should add and remove tags', () => {
    component.newTagInput = 'backend';
    component.addTag();
    expect(component.tags).toContain('backend');

    component.removeTag(component.tags.indexOf('backend'));
    expect(component.tags).not.toContain('backend');
  });

  it('should add and toggle checklist item', () => {
    component.newChecklistItemText = 'Novo subitem';
    component.addChecklistItem();

    expect(component.checklist.length).toBe(2);
    component.toggleChecklistItem(0);
    expect(component.checklist[0].completed).toBe(true);
  });
});

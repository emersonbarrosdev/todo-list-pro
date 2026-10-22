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
    expect(component.description).toBe('Notas de descrição');
    expect(component.checklist.length).toBe(1);
  });

  it('should add checklist item', () => {
    component.newChecklistItemText = 'Novo subitem';
    component.addChecklistItem();

    expect(component.checklist.length).toBe(2);
    expect(component.checklist[1].text).toBe('Novo subitem');
    expect(component.checklist[1].completed).toBe(false);
  });

  it('should toggle checklist item completion', () => {
    component.toggleChecklistItem(0);
    expect(component.checklist[0].completed).toBe(true);
  });
});

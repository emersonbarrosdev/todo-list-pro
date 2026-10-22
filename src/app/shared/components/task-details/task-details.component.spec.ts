import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    component.task = { ...mockTask };
    fixture.detectChanges();
  });

  it('should start with clean state and load initial properties', () => {
    expect(component).toBeTruthy();
    expect(component.savingStatus()).toBe('clean');
    expect(component.title).toBe('Tarefa detalhada');
    expect(component.status).toBe('todo');
    expect(component.priority).toBe('normal');
    expect(component.workMode).toBe('general');
  });

  it('should transition to dirty state when editing fields without saving automatically', () => {
    const saveSpy = vi.spyOn(component.taskSaved, 'emit');

    // Edit 20 different fields: zero API writes, zero emits!
    component.title = 'Novo título';
    component.markDirty();

    component.description = 'Nova descrição completa';
    component.markDirty();

    component.setStatus('doing');
    component.setPriority('high');
    component.setWorkMode('dev');

    component.devType = 'Bug';
    component.markDirty();

    component.devBranch = 'fix/auth';
    component.markDirty();

    component.toggleChecklistItem(0);
    component.newChecklistItemText = 'Item extra';
    component.addChecklistItem();

    component.newTagInput = 'security';
    component.addTag();

    expect(component.savingStatus()).toBe('dirty');
    expect(saveSpy).not.toHaveBeenCalled(); // 0 emits during editing!
  });

  it('should emit taskSaved exactly once when user clicks Salvar', () => {
    const saveSpy = vi.spyOn(component.taskSaved, 'emit');

    component.title = 'Título atualizado';
    component.markDirty();
    component.setStatus('done');

    component.handleSave();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(component.savingStatus()).toBe('saved');
  });

  it('should prevent double saving on rapid clicks (double-click protection)', () => {
    const saveSpy = vi.spyOn(component.taskSaved, 'emit');

    component.title = 'Evitar duplo clique';
    component.markDirty();

    // First save: sets to saving
    component.savingStatus.set('saving');
    // Rapid second click while saving: ignored
    component.handleSave();

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should prompt confirmation when trying to close with unsaved changes', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');

    component.title = 'Mudança não salva';
    component.markDirty();

    // User attempts to close
    component.requestClose();

    expect(component.showDiscardConfirm()).toBe(true);
    expect(closeSpy).not.toHaveBeenCalled();

    // User chooses to discard
    component.confirmDiscard();
    expect(component.showDiscardConfirm()).toBe(false);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should close immediately without confirmation when state is clean', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    expect(component.savingStatus()).toBe('clean');

    component.requestClose();

    expect(component.showDiscardConfirm()).toBe(false);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should trigger save on Ctrl+S / Cmd+S', () => {
    const saveSpy = vi.spyOn(component.taskSaved, 'emit');
    component.title = 'Salvar com atalho';
    component.markDirty();

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    vi.spyOn(event, 'preventDefault');

    component.handleKeyboardShortcuts(event);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});

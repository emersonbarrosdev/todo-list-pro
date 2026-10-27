import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskDetailsComponent } from './task-details.component';
import { Task } from '../../../core/models/task.model';

describe('TaskDetailsComponent', () => {
  let component: TaskDetailsComponent;
  let fixture: ComponentFixture<TaskDetailsComponent>;

  const mockTask: Task = {
    id: 'test-1',
    project_id: 'p1',
    user_id: 'user-1',
    title: 'Tarefa detalhada',
    description: 'Notas de descrição',
    status: 'backlog',
    priority: 'normal',
    due_at: null,
    qa_checklist: [{ id: 'c1', text: 'Subitem 1', completed: false }],
    qa_result: 'pending',
    qa_notes: '',
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
    expect(component.status).toBe('backlog');
    expect(component.priority).toBe('normal');
  });

  it('should transition to dirty state when editing fields without saving automatically (zero autosave)', () => {
    const saveSpy = vi.spyOn(component.save, 'emit');

    component.title = 'Novo título';
    component.markDirty();

    component.description = 'Nova descrição';
    component.markDirty();

    component.setStatus('in_progress');
    component.setPriority('high');

    expect(component.savingStatus()).toBe('dirty');
    expect(saveSpy).not.toHaveBeenCalled(); // 0 emits during editing!
  });

  it('should emit save exactly once when user clicks Salvar', () => {
    const saveSpy = vi.spyOn(component.save, 'emit');

    component.title = 'Título atualizado';
    component.markDirty();
    component.setStatus('in_progress');

    component.handleSave();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(component.savingStatus()).toBe('saved');
  });

  it('should trigger save on Ctrl+S / Cmd+S', () => {
    const saveSpy = vi.spyOn(component.save, 'emit');
    component.title = 'Salvar com atalho';
    component.markDirty();

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    vi.spyOn(event, 'preventDefault');

    component.handleKeyboardShortcuts(event);

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should show QA section when status is ready_for_test', () => {
    component.setStatus('ready_for_test');
    expect(component.shouldShowQaSection()).toBe(true);
  });

  it('should block moving to done when QA result is rejected', () => {
    component.status = 'ready_for_test';
    component.qaChecklist = [{ id: 'q1', text: 'Item de teste', completed: false }];
    component.qaResult = 'rejected';

    component.setStatus('done');

    expect(component.status).not.toBe('done');
    expect(component.qaBlockedMessage()).toContain('QA foi reprovado');
  });

  it('should allow moving to done when QA result is approved', () => {
    component.status = 'ready_for_test';
    component.qaChecklist = [{ id: 'q1', text: 'Item de teste', completed: true }];
    component.qaResult = 'approved';

    component.setStatus('done');

    expect(component.status).toBe('done');
    expect(component.qaBlockedMessage()).toBeNull();
  });

  it('should allow adding images during task creation and emit them in save payload', () => {
    component.isNew = true;
    component.task = null;
    component.ngOnInit();

    expect(component.images).toEqual([]);

    // Add image/screenshot
    component.images.push('data:image/png;base64,mockImage123');
    component.title = 'Nova tarefa com prints';
    component.markDirty();

    const saveSpy = vi.spyOn(component.save, 'emit');
    component.handleSave();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const emitted = saveSpy.mock.calls[0][0] as any;
    expect(emitted.title).toBe('Nova tarefa com prints');
    expect(emitted.images).toEqual(['data:image/png;base64,mockImage123']);
  });

  it('should remove image attachment and mark form dirty', () => {
    component.images = ['data:image/png;base64,img1', 'data:image/png;base64,img2'];
    const fakeEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;

    component.removeImage(0, fakeEvent);

    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(component.images).toEqual(['data:image/png;base64,img2']);
    expect(component.savingStatus()).toBe('dirty');
  });
});

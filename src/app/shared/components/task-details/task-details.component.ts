import { Component, EventEmitter, HostListener, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, QaChecklistItem, QaResult, UpdateTaskDto, TaskStatus, TaskPriority, CreateTaskDto } from '../../../core/models/task.model';
import { Project } from '../../../core/models/project.model';
import { SafeMarkdownPipe } from '../../pipes/safe-markdown.pipe';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeMarkdownPipe],
  template: `
    <div class="details-backdrop" (click)="requestClose()">
      <aside class="details-sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="task-detail-title">
        <!-- Sheet Header -->
        <div class="sheet-header">
          <div class="header-left">
            <!-- Manual Save Button -->
            <button
              id="btn-save-task"
              type="button"
              class="btn-save"
              [class.clean]="savingStatus() === 'clean'"
              [class.dirty]="savingStatus() === 'dirty'"
              [class.saving]="savingStatus() === 'saving'"
              [class.saved]="savingStatus() === 'saved'"
              [class.error]="savingStatus() === 'error'"
              [disabled]="savingStatus() === 'clean' || savingStatus() === 'saving' || !title.trim()"
              (click)="handleSave()"
              title="Salvar alterações (Ctrl+S / Cmd+S)"
            >
              @if (savingStatus() === 'saving') {
                <span class="spinner-mini"></span>
                <span>Salvando...</span>
              } @else if (savingStatus() === 'saved') {
                <span>✓ Salvo</span>
              } @else if (savingStatus() === 'error') {
                <span>✕ Tentar novamente</span>
              } @else if (isNew) {
                <span>Criar tarefa</span>
              } @else {
                <span>Salvar</span>
              }
            </button>

            @if (savingStatus() === 'error') {
              <span class="error-text">Não foi possível salvar. Tente novamente.</span>
            }
            @if (qaBlockedMessage()) {
              <span class="qa-blocked-warning">{{ qaBlockedMessage() }}</span>
            }
          </div>

          <div class="header-right">
            <span class="shortcut-hint"><kbd>Ctrl+S</kbd></span>

            @if (!isNew && task) {
              <button
                type="button"
                class="btn-delete"
                (click)="handleDelete()"
                title="Excluir tarefa"
                aria-label="Excluir tarefa"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            }

            <button
              type="button"
              class="btn-close"
              (click)="requestClose()"
              aria-label="Fechar painel de detalhes"
              title="Fechar (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="sheet-body">
          <!-- Title Input -->
          <div class="field-block">
            <input
              id="task-detail-title"
              type="text"
              class="title-input"
              [(ngModel)]="title"
              (ngModelChange)="markDirty()"
              placeholder="Título da tarefa..."
              maxlength="200"
            />
          </div>

          <!-- Essential Properties Grid -->
          <div class="properties-grid">
            <!-- Project Selector -->
            <div class="property-item">
              <span class="property-label">Projeto</span>
              <select
                class="select select-compact"
                [(ngModel)]="projectId"
                (ngModelChange)="markDirty()"
              >
                @for (p of projects; track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>

            <!-- Status Selector -->
            <div class="property-item full-width">
              <span class="property-label">Status</span>
              <div class="property-pills">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="status === 'backlog'"
                  (click)="setStatus('backlog')"
                >
                  Backlog
                </button>
                <button
                  type="button"
                  class="pill-btn pill-in-progress"
                  [class.active]="status === 'in_progress'"
                  (click)="setStatus('in_progress')"
                >
                  Em andamento
                </button>
                <button
                  type="button"
                  class="pill-btn pill-ready-for-test"
                  [class.active]="status === 'ready_for_test'"
                  (click)="setStatus('ready_for_test')"
                >
                  Pronto para testar
                </button>
                <button
                  type="button"
                  class="pill-btn pill-done"
                  [class.active]="status === 'done'"
                  (click)="setStatus('done')"
                >
                  Concluído
                </button>
              </div>
            </div>

            <!-- Priority Selector -->
            <div class="property-item">
              <span class="property-label">Prioridade</span>
              <div class="property-pills">
                <button
                  type="button"
                  class="pill-btn pill-low"
                  [class.active]="priority === 'low'"
                  (click)="setPriority('low')"
                >
                  Baixa
                </button>
                <button
                  type="button"
                  class="pill-btn pill-normal"
                  [class.active]="priority === 'normal'"
                  (click)="setPriority('normal')"
                >
                  Normal
                </button>
                <button
                  type="button"
                  class="pill-btn pill-high"
                  [class.active]="priority === 'high'"
                  (click)="setPriority('high')"
                >
                  Alta
                </button>
              </div>
            </div>

            <!-- Due Date -->
            <div class="property-item">
              <span class="property-label">Prazo</span>
              <div class="date-input-wrapper">
                <input
                  type="date"
                  class="input date-picker"
                  [(ngModel)]="dueDate"
                  (ngModelChange)="markDirty()"
                />
                @if (dueDate) {
                  <button
                    type="button"
                    class="btn-clear-date"
                    (click)="clearDueDate()"
                    title="Remover prazo"
                  >
                    ✕
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Description Block with Simple Markdown Preview -->
          <div class="field-block description-block">
            <div class="desc-header">
              <span class="field-label">Descrição</span>
              <div class="desc-mode-toggle">
                <button
                  type="button"
                  class="btn-toggle"
                  [class.active]="!showMarkdownPreview()"
                  (click)="showMarkdownPreview.set(false)"
                >
                  Editar
                </button>
                <button
                  type="button"
                  class="btn-toggle"
                  [class.active]="showMarkdownPreview()"
                  (click)="showMarkdownPreview.set(true)"
                >
                  Prévia
                </button>
              </div>
            </div>

            @if (!showMarkdownPreview()) {
              <textarea
                class="textarea desc-textarea"
                [(ngModel)]="description"
                (ngModelChange)="markDirty()"
                placeholder="Descrição simples (suporta **negrito**, listas e codigo)..."
                rows="5"
              ></textarea>
            } @else {
              <div class="markdown-preview" [innerHTML]="description | safeMarkdown"></div>
            }
          </div>

          <!-- QA Verification Section: Visible ONLY when status is ready_for_test OR has saved QA items -->
          @if (shouldShowQaSection()) {
            <div class="qa-verification-section">
              <div class="qa-section-header">
                <div class="qa-title-group">
                  <span class="qa-badge">QA</span>
                  <span class="qa-section-title">VERIFICAÇÃO DE QA</span>
                </div>

                <div class="qa-result-selector">
                  <span class="qa-result-label">Resultado:</span>
                  <button
                    type="button"
                    class="qa-result-btn pill-pending"
                    [class.active]="qaResult === 'pending'"
                    (click)="setQaResult('pending')"
                  >
                    Pendente
                  </button>
                  <button
                    type="button"
                    class="qa-result-btn pill-approved"
                    [class.active]="qaResult === 'approved'"
                    (click)="setQaResult('approved')"
                  >
                    Aprovado
                  </button>
                  <button
                    type="button"
                    class="qa-result-btn pill-rejected"
                    [class.active]="qaResult === 'rejected'"
                    (click)="setQaResult('rejected')"
                  >
                    Reprovado
                  </button>
                </div>
              </div>

              <!-- QA Checklist Items -->
              <div class="qa-checklist-list">
                @for (item of qaChecklist; track item.id; let idx = $index) {
                  <div class="qa-check-item">
                    <label class="checkbox-container">
                      <input
                        type="checkbox"
                        [checked]="item.completed"
                        (change)="toggleQaItem(idx)"
                      />
                      <span class="checkbox-box"></span>
                    </label>

                    <input
                      type="text"
                      class="qa-check-input"
                      [(ngModel)]="item.text"
                      (ngModelChange)="markDirty()"
                      placeholder="Item de validação (ex: login funciona)..."
                    />

                    <button
                      type="button"
                      class="btn-remove-qa"
                      (click)="removeQaItem(idx)"
                      title="Remover item de teste"
                    >
                      ✕
                    </button>
                  </div>
                }

                <!-- Add QA Check Item Input -->
                <div class="add-qa-item-bar">
                  <input
                    type="text"
                    class="input input-sm qa-add-input"
                    [(ngModel)]="newQaItemText"
                    (keydown.enter)="addQaItem()"
                    placeholder="+ Adicionar item de validação..."
                  />
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    [disabled]="!newQaItemText.trim()"
                    (click)="addQaItem()"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <!-- Optional QA Notes / Observação -->
              <div class="qa-notes-block">
                <label class="qa-notes-label">Observação opcional de teste</label>
                <input
                  type="text"
                  class="input input-sm"
                  [(ngModel)]="qaNotes"
                  (ngModelChange)="markDirty()"
                  placeholder="Ex: Validado em 2K no navegador Chrome..."
                />
              </div>
            </div>
          }
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .details-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      animation: fadeInBackdrop 0.15s ease-out;
    }

    .details-sheet {
      width: 100%;
      max-width: 580px;
      height: 100%;
      background: #14141E;
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.6);
      animation: slideInSheet 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sheet-header {
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: #161622;
      flex-shrink: 0;
    }

    .header-left, .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 1rem;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 600;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-save.clean {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      border-color: var(--border);
      cursor: default;
    }

    .btn-save.dirty {
      background: var(--primary);
      color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
    }

    .btn-save.dirty:hover {
      background: var(--primary-hover);
    }

    .btn-save.saving {
      background: var(--primary-dark);
      color: #FFFFFF;
      cursor: wait;
    }

    .btn-save.saved {
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
      border-color: rgba(16, 185, 129, 0.4);
    }

    .btn-save.error {
      background: rgba(239, 68, 68, 0.2);
      color: #F87171;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .error-text {
      font-size: 0.75rem;
      color: #F87171;
    }

    .qa-blocked-warning {
      font-size: 0.75rem;
      color: #F59E0B;
      font-weight: 500;
    }

    .shortcut-hint {
      color: var(--text-muted);
    }

    .shortcut-hint kbd {
      font-family: inherit;
      font-size: 0.6875rem;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
    }

    .btn-delete {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.35rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .btn-delete:hover {
      color: #F87171;
      background: rgba(239, 68, 68, 0.12);
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: color var(--transition-fast);
    }

    .btn-close:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.06);
    }

    .sheet-body {
      padding: 1.25rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .title-input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 1px solid transparent;
      color: #FFFFFF;
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0.35rem 0;
      outline: none;
      transition: border-color var(--transition-fast);
    }

    .title-input:focus {
      border-bottom-color: var(--primary);
    }

    .title-input::placeholder {
      color: var(--text-muted);
    }

    .properties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      background: #171725;
      padding: 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
    }

    .property-item {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .property-item.full-width {
      grid-column: 1 / -1;
    }

    .property-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .property-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .pill-btn {
      padding: 0.28rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .pill-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text);
    }

    .pill-btn.active {
      background: rgba(139, 92, 246, 0.2);
      border-color: var(--primary);
      color: #C4B5FD;
    }

    .pill-btn.pill-in-progress.active {
      background: rgba(96, 165, 250, 0.2);
      border-color: #60A5FA;
      color: #93C5FD;
    }

    .pill-btn.pill-ready-for-test.active {
      background: rgba(245, 158, 11, 0.2);
      border-color: #F59E0B;
      color: #FCD34D;
    }

    .pill-btn.pill-done.active {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10B981;
      color: #6EE7B7;
    }

    .pill-btn.pill-high.active {
      background: rgba(239, 68, 68, 0.2);
      border-color: #EF4444;
      color: #FCA5A5;
    }

    .date-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .date-picker {
      padding: 0.28rem 0.5rem;
      font-size: 0.8125rem;
    }

    .btn-clear-date {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8125rem;
      padding: 0.2rem;
    }

    /* Description */
    .description-block {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .desc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .desc-mode-toggle {
      display: flex;
      gap: 0.25rem;
    }

    .btn-toggle {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn-toggle.active {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border);
      color: var(--text);
    }

    .desc-textarea {
      font-family: inherit;
      line-height: 1.5;
      font-size: 0.875rem;
    }

    .markdown-preview {
      min-height: 100px;
      padding: 0.65rem 0.85rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text);
    }

    /* QA Verification Section */
    .qa-verification-section {
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .qa-section-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .qa-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .qa-badge {
      font-size: 0.6875rem;
      font-weight: 800;
      background: #F59E0B;
      color: #000000;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .qa-section-title {
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #FCD34D;
    }

    .qa-result-selector {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .qa-result-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .qa-result-btn {
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .qa-result-btn.pill-pending.active {
      background: rgba(148, 163, 184, 0.2);
      border-color: #94A3B8;
      color: #E2E8F0;
    }

    .qa-result-btn.pill-approved.active {
      background: rgba(16, 185, 129, 0.25);
      border-color: #10B981;
      color: #6EE7B7;
    }

    .qa-result-btn.pill-rejected.active {
      background: rgba(239, 68, 68, 0.25);
      border-color: #EF4444;
      color: #FCA5A5;
    }

    .qa-checklist-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .qa-check-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.35rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .qa-check-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text);
      font-size: 0.8125rem;
      outline: none;
    }

    .btn-remove-qa {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.2rem;
      font-size: 0.8125rem;
    }

    .btn-remove-qa:hover {
      color: #F87171;
    }

    .add-qa-item-bar {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .qa-add-input {
      flex: 1;
    }

    .qa-notes-block {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .qa-notes-label {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideInSheet {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @media (max-width: 640px) {
      .details-sheet {
        max-width: 100%;
      }
      .properties-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TaskDetailsComponent implements OnInit {
  @Input() task: Task | null = null;
  @Input() projects: Project[] = [];
  @Input() defaultProjectId: string = '';
  @Input() isNew = false;

  @Output() save = new EventEmitter<UpdateTaskDto | CreateTaskDto>();
  @Output() delete = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  title = '';
  projectId = '';
  description = '';
  status: TaskStatus = 'backlog';
  priority: TaskPriority = 'normal';
  dueDate = '';
  qaChecklist: QaChecklistItem[] = [];
  qaResult: QaResult = 'pending';
  qaNotes = '';

  newQaItemText = '';
  showMarkdownPreview = signal(false);
  savingStatus = signal<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  qaBlockedMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (this.task) {
      this.title = this.task.title || '';
      this.projectId = this.task.project_id || this.defaultProjectId || (this.projects[0]?.id || '');
      this.description = this.task.description || '';
      this.status = this.task.status || 'backlog';
      this.priority = this.task.priority || 'normal';
      this.dueDate = this.task.due_at ? this.task.due_at.substring(0, 10) : '';
      this.qaChecklist = this.task.qa_checklist ? [...this.task.qa_checklist] : [];
      this.qaResult = this.task.qa_result || 'pending';
      this.qaNotes = this.task.qa_notes || '';
    } else {
      this.projectId = this.defaultProjectId || (this.projects[0]?.id || '');
    }
    this.savingStatus.set(this.isNew ? 'dirty' : 'clean');
  }

  shouldShowQaSection(): boolean {
    return (
      this.status === 'ready_for_test' ||
      (this.qaChecklist && this.qaChecklist.length > 0) ||
      this.qaResult !== 'pending'
    );
  }

  markDirty(): void {
    this.qaBlockedMessage.set(null);
    if (this.savingStatus() !== 'saving') {
      this.savingStatus.set('dirty');
    }
  }

  setStatus(newStatus: TaskStatus): void {
    // Requirement 19: If QA was rejected, prevent moving to done directly
    if (newStatus === 'done' && this.qaChecklist.length > 0 && this.qaResult === 'rejected') {
      this.qaBlockedMessage.set('Não é possível concluir: o QA foi reprovado.');
      return;
    }

    this.qaBlockedMessage.set(null);
    this.status = newStatus;
    this.markDirty();
  }

  setPriority(p: TaskPriority): void {
    this.priority = p;
    this.markDirty();
  }

  clearDueDate(): void {
    this.dueDate = '';
    this.markDirty();
  }

  setQaResult(res: QaResult): void {
    this.qaResult = res;
    this.markDirty();
  }

  toggleQaItem(index: number): void {
    if (this.qaChecklist[index]) {
      this.qaChecklist[index].completed = !this.qaChecklist[index].completed;
      this.markDirty();
    }
  }

  removeQaItem(index: number): void {
    this.qaChecklist.splice(index, 1);
    this.markDirty();
  }

  addQaItem(): void {
    const text = this.newQaItemText.trim();
    if (!text) return;

    this.qaChecklist.push({
      id: 'qa_' + Math.random().toString(36).substring(2, 8),
      text,
      completed: false,
    });
    this.newQaItemText = '';
    this.markDirty();
  }

  handleSave(): void {
    const cleanTitle = this.title.trim();
    if (!cleanTitle) return;

    // Validation: Block done if QA is rejected
    if (this.status === 'done' && this.qaChecklist.length > 0 && this.qaResult === 'rejected') {
      this.qaBlockedMessage.set('Não é possível concluir uma tarefa com QA reprovado.');
      return;
    }

    this.savingStatus.set('saving');

    const payload: any = {
      project_id: this.projectId,
      title: cleanTitle,
      description: this.description,
      status: this.status,
      priority: this.priority,
      due_at: this.dueDate ? new Date(this.dueDate).toISOString() : null,
      qa_checklist: this.qaChecklist,
      qa_result: this.qaResult,
      qa_notes: this.qaNotes,
    };

    this.save.emit(payload);
    this.savingStatus.set('saved');

    setTimeout(() => {
      if (this.savingStatus() === 'saved') {
        this.savingStatus.set('clean');
      }
    }, 1200);
  }

  handleDelete(): void {
    if (this.task?.id) {
      this.delete.emit(this.task.id);
    }
  }

  requestClose(): void {
    this.close.emit();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl+S / Cmd+S -> Save
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.title.trim() && this.savingStatus() !== 'clean') {
        this.handleSave();
      }
      return;
    }

    // Esc -> Close
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
    }
  }
}

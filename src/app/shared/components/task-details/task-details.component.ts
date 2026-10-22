import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Task, ChecklistItem, UpdateTaskDto, TaskStatus, TaskPriority, WorkMode } from '../../../core/models/task.model';
import { SafeMarkdownPipe } from '../../pipes/safe-markdown.pipe';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeMarkdownPipe],
  template: `
    <div class="details-backdrop" (click)="close.emit()">
      <aside class="details-sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="task-detail-title">
        <!-- Sheet Header -->
        <div class="sheet-header">
          <div class="status-indicator">
            @if (savingStatus() === 'saving') {
              <span class="status-badge status-saving">
                <span class="spinner-mini"></span>
                <span>Salvando...</span>
              </span>
            } @else if (savingStatus() === 'saved') {
              <span class="status-badge status-saved">
                <span>✓ Salvo</span>
              </span>
            } @else if (savingStatus() === 'error') {
              <span class="status-badge status-error">
                <span>✕ Erro ao salvar</span>
              </span>
            }
          </div>

          <button
            type="button"
            class="btn-close"
            (click)="close.emit()"
            aria-label="Fechar painel de detalhes"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        <div class="sheet-body">
          <!-- Title Input -->
          <div class="field-block">
            <input
              id="task-detail-title"
              type="text"
              class="title-input"
              [(ngModel)]="title"
              (ngModelChange)="onFieldChanged()"
              placeholder="Título da tarefa..."
              maxlength="160"
            />
          </div>

          <!-- Essential Properties Grid -->
          <div class="properties-grid">
            <!-- Status Pill Selector -->
            <div class="property-item">
              <span class="property-label">Status</span>
              <div class="property-pills">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="status === 'todo'"
                  (click)="setStatus('todo')"
                >
                  A fazer
                </button>
                <button
                  type="button"
                  class="pill-btn pill-doing"
                  [class.active]="status === 'doing'"
                  (click)="setStatus('doing')"
                >
                  Em andamento
                </button>
                <button
                  type="button"
                  class="pill-btn pill-done"
                  [class.active]="status === 'done'"
                  (click)="setStatus('done')"
                >
                  Concluída
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

            <!-- Work Mode Selector -->
            <div class="property-item">
              <span class="property-label">Modo da Tarefa</span>
              <div class="property-pills">
                <button
                  type="button"
                  class="pill-btn"
                  [class.active]="workMode === 'general'"
                  (click)="setWorkMode('general')"
                >
                  Geral
                </button>
                <button
                  type="button"
                  class="pill-btn pill-doing"
                  [class.active]="workMode === 'dev'"
                  (click)="setWorkMode('dev')"
                >
                  DEV
                </button>
                <button
                  type="button"
                  class="pill-btn pill-done"
                  [class.active]="workMode === 'qa'"
                  (click)="setWorkMode('qa')"
                >
                  QA
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
                  (ngModelChange)="onDueDateChanged()"
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

            <!-- Tags -->
            <div class="property-item tags-full-width">
              <span class="property-label">Tags (máx. 5)</span>
              <div class="tags-wrapper">
                @for (tag of tags; track tag; let idx = $index) {
                  <span class="tag-chip">
                    #{{ tag }}
                    <button
                      type="button"
                      class="tag-remove"
                      (click)="removeTag(idx)"
                    >
                      ✕
                    </button>
                  </span>
                }
                @if (tags.length < 5) {
                  <input
                    type="text"
                    class="tag-input"
                    [(ngModel)]="newTagInput"
                    (keydown.enter)="addTag()"
                    (keydown.comma)="addTag()"
                    placeholder="+ Adicionar tag..."
                    maxlength="20"
                  />
                }
              </div>
            </div>
          </div>

          <!-- Developer Mode Details Section -->
          @if (workMode === 'dev') {
            <div class="mode-section dev-section">
              <div class="section-badge-title">
                <span class="mode-indicator dev-dot"></span>
                <span>Detalhes de desenvolvimento</span>
              </div>

              <div class="dev-fields-grid">
                <!-- Tipo -->
                <div class="field-group">
                  <label class="field-label">Tipo de desenvolvimento</label>
                  <select
                    class="select"
                    [(ngModel)]="devType"
                    (ngModelChange)="onFieldChanged()"
                  >
                    <option value="">Selecione o tipo...</option>
                    <option value="Feature">Feature</option>
                    <option value="Bug">Bug</option>
                    <option value="Refactor">Refactor</option>
                    <option value="Chore">Chore</option>
                    <option value="Docs">Docs</option>
                  </select>
                </div>

                <!-- Projeto -->
                <div class="field-group">
                  <label class="field-label">Projeto</label>
                  <input
                    type="text"
                    class="input"
                    [(ngModel)]="devProject"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="ex.: Core API, Frontend"
                  />
                </div>

                <!-- Branch -->
                <div class="field-group">
                  <label class="field-label">Branch</label>
                  <input
                    type="text"
                    class="input"
                    [(ngModel)]="devBranch"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="ex.: feat/auth-otp"
                  />
                </div>

                <!-- Ambiente -->
                <div class="field-group">
                  <label class="field-label">Ambiente</label>
                  <input
                    type="text"
                    class="input"
                    [(ngModel)]="devEnvironment"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="ex.: local, staging, prod"
                  />
                </div>

                <!-- PR / URL Relacionada -->
                <div class="field-group full-width">
                  <div class="field-label-row">
                    <label class="field-label">PR / URL relacionada</label>
                    @if (isValidWebUrl(devPrUrl)) {
                      <a [href]="devPrUrl" target="_blank" rel="noopener noreferrer" class="link-external" title="Abrir link seguro">
                        <span>Abrir</span> ↗
                      </a>
                    }
                  </div>
                  <input
                    type="url"
                    class="input"
                    [(ngModel)]="devPrUrl"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="https://github.com/.../pull/..."
                  />
                </div>
              </div>
            </div>
          }

          <!-- QA Mode Details Section -->
          @if (workMode === 'qa') {
            <div class="mode-section qa-section">
              <div class="section-badge-title">
                <span class="mode-indicator qa-dot"></span>
                <span>Detalhes de QA</span>
              </div>

              <div class="qa-fields-grid">
                <!-- Tipo de QA -->
                <div class="field-group">
                  <label class="field-label">Tipo de teste / issue</label>
                  <select
                    class="select"
                    [(ngModel)]="qaType"
                    (ngModelChange)="onFieldChanged()"
                  >
                    <option value="">Selecione o tipo...</option>
                    <option value="Teste">Teste</option>
                    <option value="Bug">Bug</option>
                    <option value="Regressão">Regressão</option>
                  </select>
                </div>

                <!-- Severidade -->
                <div class="field-group">
                  <label class="field-label">Severidade</label>
                  <select
                    class="select"
                    [(ngModel)]="qaSeverity"
                    (ngModelChange)="onFieldChanged()"
                  >
                    <option value="">Selecione a severidade...</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>

                <!-- Ambiente -->
                <div class="field-group full-width">
                  <label class="field-label">Ambiente testado</label>
                  <input
                    type="text"
                    class="input"
                    [(ngModel)]="qaEnvironment"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="ex.: Staging v2.4, Produção, Chrome / Windows"
                  />
                </div>

                <!-- Passos para reproduzir -->
                <div class="field-group full-width">
                  <label class="field-label">Passos para reproduzir</label>
                  <textarea
                    class="textarea textarea-compact"
                    [(ngModel)]="qaSteps"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="1. Acessar a tela... 2. Clicar em... 3. Observar erro..."
                  ></textarea>
                </div>

                <!-- Resultado esperado -->
                <div class="field-group">
                  <label class="field-label">Resultado esperado</label>
                  <textarea
                    class="textarea textarea-compact"
                    [(ngModel)]="qaExpected"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="O que deveria acontecer..."
                  ></textarea>
                </div>

                <!-- Resultado obtido -->
                <div class="field-group">
                  <label class="field-label">Resultado obtido</label>
                  <textarea
                    class="textarea textarea-compact"
                    [(ngModel)]="qaActual"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="O que de fato ocorreu..."
                  ></textarea>
                </div>

                <!-- URL de Evidência -->
                <div class="field-group full-width">
                  <div class="field-label-row">
                    <label class="field-label">URL de evidência / gravação</label>
                    @if (isValidWebUrl(qaEvidenceUrl)) {
                      <a [href]="qaEvidenceUrl" target="_blank" rel="noopener noreferrer" class="link-external" title="Abrir link seguro">
                        <span>Abrir</span> ↗
                      </a>
                    }
                  </div>
                  <input
                    type="url"
                    class="input"
                    [(ngModel)]="qaEvidenceUrl"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="https://loom.com/... ou https://drive.google.com/..."
                  />
                </div>
              </div>
            </div>
          }

          <!-- Description Block with Markdown Toolbar -->
          <div class="field-block">
            <div class="description-header">
              <span class="block-label">Descrição</span>
              <div class="md-toolbar">
                <button
                  type="button"
                  class="toolbar-btn"
                  (click)="insertBold()"
                  title="Negrito"
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  class="toolbar-btn"
                  (click)="insertList()"
                  title="Lista"
                >
                  ☰
                </button>
                <button
                  type="button"
                  class="toolbar-btn"
                  (click)="insertCode()"
                  title="Código"
                >
                  &lt;/&gt;
                </button>
                <button
                  type="button"
                  class="toolbar-btn preview-toggle"
                  [class.active]="previewMode()"
                  (click)="previewMode.set(!previewMode())"
                  title="Alternar pré-visualização"
                >
                  {{ previewMode() ? 'Editar' : 'Visualizar' }}
                </button>
              </div>
            </div>

            @if (previewMode()) {
              <div
                class="markdown-preview"
                [innerHTML]="description | safeMarkdown"
              ></div>
            } @else {
              <textarea
                class="textarea description-textarea"
                [(ngModel)]="description"
                (ngModelChange)="onFieldChanged()"
                placeholder="Adicione detalhes ou notas em Markdown..."
              ></textarea>
            }
          </div>

          <!-- Checklist Section -->
          <div class="field-block">
            <div class="checklist-header">
              <span class="block-label">Checklist</span>
              @if (checklist.length > 0) {
                <span class="checklist-progress">
                  {{ completedChecklistCount }}/{{ checklist.length }} concluídos
                </span>
              }
            </div>

            <div class="checklist-items">
              @for (item of checklist; track item.id; let i = $index) {
                <div class="checklist-row">
                  <input
                    type="checkbox"
                    class="checkbox-custom"
                    [checked]="item.completed"
                    (change)="toggleChecklistItem(i)"
                    [attr.aria-label]="'Marcar item ' + item.text"
                  />
                  <input
                    type="text"
                    class="checklist-input"
                    [class.completed]="item.completed"
                    [(ngModel)]="item.text"
                    (ngModelChange)="onFieldChanged()"
                    placeholder="Item do checklist..."
                  />
                  <button
                    type="button"
                    class="checklist-remove"
                    (click)="removeChecklistItem(i)"
                    title="Remover item"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>

            <!-- Add Checklist Item -->
            <div class="checklist-add-row">
              <input
                type="text"
                class="input checklist-new-input"
                [(ngModel)]="newChecklistItemText"
                (keydown.enter)="addChecklistItem()"
                placeholder="+ Adicionar item ao checklist (Enter)"
              />
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="addChecklistItem()"
                [disabled]="!newChecklistItemText.trim()"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .details-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(8, 8, 14, 0.6);
      backdrop-filter: blur(4px);
      z-index: 150;
      display: flex;
      justify-content: flex-end;
      animation: backdrop-in 140ms ease-out;
    }

    .details-sheet {
      width: 100%;
      max-width: 540px;
      height: 100%;
      background: var(--surface);
      border-left: 1px solid var(--border);
      box-shadow: var(--shadow-sheet);
      display: flex;
      flex-direction: column;
      animation: sheet-slide-in 180ms ease-out;
    }

    .sheet-header {
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface-secondary);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }

    .status-saving {
      color: var(--text-muted);
      background: var(--surface);
    }

    .status-saved {
      color: var(--success);
      background: var(--success-soft);
    }

    .status-error {
      color: var(--danger);
      background: var(--danger-soft);
    }

    .spinner-mini {
      width: 10px;
      height: 10px;
      border: 1.5px solid var(--text-muted);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .btn-close {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-xs);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 1rem;
      transition: all var(--transition-fast);
    }

    .btn-close:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .sheet-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .field-block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .block-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .title-input {
      width: 100%;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
      background: transparent;
      border: none;
      outline: none;
      padding: 0.25rem 0;
      line-height: 1.4;
      border-bottom: 1.5px solid transparent;
      transition: border-color var(--transition-fast);
    }

    .title-input:focus {
      border-bottom-color: var(--primary);
    }

    /* Properties Grid */
    .properties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1rem;
    }

    .property-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .property-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .property-pills {
      display: flex;
      gap: 0.3rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      padding: 0.2rem;
    }

    .pill-btn {
      flex: 1;
      padding: 0.3rem 0.4rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      text-align: center;
      transition: all var(--transition-fast);
    }

    .pill-btn:hover {
      color: var(--text);
    }

    .pill-btn.active {
      background: var(--surface-hover);
      color: var(--text);
      font-weight: 600;
    }

    .pill-doing.active {
      background: rgba(59, 130, 246, 0.16);
      color: #60A5FA;
    }

    .pill-done.active {
      background: var(--success-soft);
      color: #4ADE80;
    }

    .pill-high.active {
      background: var(--danger-soft);
      color: #F87171;
    }

    .pill-normal.active {
      background: var(--primary-soft);
      color: var(--accent);
    }

    .date-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .date-picker {
      padding: 0.35rem 0.6rem;
      font-size: 0.8125rem;
      color-scheme: dark;
    }

    .btn-clear-date {
      position: absolute;
      right: 0.5rem;
      color: var(--text-muted);
      font-size: 0.75rem;
      cursor: pointer;
    }
    .btn-clear-date:hover {
      color: var(--text);
    }

    .tags-full-width {
      grid-column: span 2;
    }

    .mode-section {
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .dev-section {
      border-left: 3px solid #60A5FA;
    }

    .qa-section {
      border-left: 3px solid #F472B6;
    }

    .section-badge-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
    }

    .mode-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dev-dot {
      background: #60A5FA;
      box-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
    }

    .qa-dot {
      background: #F472B6;
      box-shadow: 0 0 8px rgba(244, 114, 182, 0.5);
    }

    .dev-fields-grid,
    .qa-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .textarea-compact {
      min-height: 72px;
      padding: 0.45rem 0.65rem;
      font-size: 0.8125rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .field-group.full-width {
      grid-column: span 2;
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
    }

    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      padding: 0.35rem 0.5rem;
      min-height: 38px;
    }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.45rem;
      font-size: 0.75rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: 9999px;
      color: var(--text-secondary);
    }

    .tag-remove {
      color: var(--text-muted);
      font-size: 0.6875rem;
      cursor: pointer;
      padding: 0 0.15rem;
    }
    .tag-remove:hover {
      color: var(--danger);
    }

    .tag-input {
      border: none;
      background: transparent;
      outline: none;
      color: var(--text);
      font-size: 0.8125rem;
      flex: 1;
      min-width: 100px;
    }

    .field-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .link-external {
      font-size: 0.75rem;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      transition: color var(--transition-fast);
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }

    .link-external:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    .description-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .md-toolbar {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      padding: 0.15rem;
    }

    .toolbar-btn {
      padding: 0.2rem 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
      border-radius: var(--radius-xs);
      transition: all var(--transition-fast);
    }

    .toolbar-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .preview-toggle.active {
      background: var(--primary-soft);
      color: var(--accent);
      font-weight: 600;
    }

    .description-textarea {
      min-height: 120px;
      font-size: 0.875rem;
    }

    .markdown-preview {
      min-height: 120px;
      padding: 0.75rem 0.85rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      color: var(--text);
      line-height: 1.6;
    }

    .markdown-preview strong {
      color: #FFFFFF;
      font-weight: 600;
    }

    .markdown-preview em {
      color: var(--accent);
    }

    .markdown-preview code {
      font-family: monospace;
      background: var(--surface);
      padding: 0.15rem 0.35rem;
      border-radius: var(--radius-xs);
      font-size: 0.8125rem;
      color: #F472B6;
    }

    .markdown-preview ul {
      margin-left: 1.25rem;
      margin-top: 0.25rem;
    }

    .checklist-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .checklist-progress {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .checklist-items {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .checklist-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.35rem 0.5rem;
      border-radius: var(--radius-xs);
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      transition: background var(--transition-fast);
    }

    .checklist-row:hover {
      background: var(--surface-hover);
    }

    .checklist-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text);
      font-size: 0.875rem;
    }

    .checklist-input.completed {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .checklist-remove {
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
      cursor: pointer;
      border-radius: var(--radius-xs);
      transition: all var(--transition-fast);
    }

    .checklist-remove:hover {
      color: var(--danger);
      background: var(--danger-soft);
    }

    .checklist-add-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }

    .checklist-new-input {
      font-size: 0.8125rem;
      padding: 0.45rem 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes sheet-slide-in {
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
      .tags-full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class TaskDetailsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: Task;
  @Output() taskUpdated = new EventEmitter<UpdateTaskDto>();
  @Output() close = new EventEmitter<void>();

  title: string = '';
  description: string = '';
  status: TaskStatus = 'todo';
  priority: TaskPriority = 'normal';
  workMode: WorkMode = 'general';
  dueDate: string = '';
  tags: string[] = [];
  newTagInput: string = '';
  checklist: ChecklistItem[] = [];
  newChecklistItemText: string = '';

  // DEV fields
  devType: string = '';
  devProject: string = '';
  devBranch: string = '';
  devEnvironment: string = '';
  devPrUrl: string = '';

  // QA fields
  qaType: string = '';
  qaSeverity: string = '';
  qaEnvironment: string = '';
  qaSteps: string = '';
  qaExpected: string = '';
  qaActual: string = '';
  qaEvidenceUrl: string = '';

  previewMode = signal<boolean>(false);
  savingStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  private changeSubject = new Subject<void>();
  private sub?: Subscription;

  get completedChecklistCount(): number {
    return this.checklist.filter((c) => c.completed).length;
  }

  ngOnInit() {
    this.title = this.task.title;
    this.description = this.task.description || '';
    this.status = this.task.status || 'todo';
    this.priority = this.task.priority || 'normal';
    this.workMode = this.task.work_mode || 'general';
    this.dueDate = this.task.due_at ? this.task.due_at.split('T')[0] : '';
    this.tags = [...(this.task.tags || [])];
    this.checklist = JSON.parse(JSON.stringify(this.task.checklist || []));

    // Load DEV & QA metadata
    if (this.task.metadata) {
      this.devType = (this.task.metadata['type'] as string) || '';
      this.devProject = (this.task.metadata['project'] as string) || '';
      this.devBranch = (this.task.metadata['branch'] as string) || '';
      this.devEnvironment = (this.task.metadata['environment'] as string) || '';
      this.devPrUrl = (this.task.metadata['pr_url'] as string) || '';

      if (this.workMode === 'qa') {
        this.qaType = (this.task.metadata['type'] as string) || '';
      }
      this.qaSeverity = (this.task.metadata['severity'] as string) || '';
      this.qaEnvironment = (this.task.metadata['environment'] as string) || this.devEnvironment;
      this.qaSteps = (this.task.metadata['steps_to_reproduce'] as string) || '';
      this.qaExpected = (this.task.metadata['expected_result'] as string) || '';
      this.qaActual = (this.task.metadata['actual_result'] as string) || '';
      this.qaEvidenceUrl = (this.task.metadata['evidence_url'] as string) || '';
    }

    // Debounce auto-save at 600ms
    this.sub = this.changeSubject.pipe(debounceTime(600)).subscribe(() => {
      this.executeAutoSave();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  onFieldChanged() {
    this.savingStatus.set('saving');
    this.changeSubject.next();
  }

  setWorkMode(mode: WorkMode) {
    this.workMode = mode;
    this.onFieldChanged();
  }

  setStatus(newStatus: TaskStatus) {
    this.status = newStatus;
    this.onFieldChanged();
  }

  setPriority(newPriority: TaskPriority) {
    this.priority = newPriority;
    this.onFieldChanged();
  }

  onDueDateChanged() {
    this.onFieldChanged();
  }

  clearDueDate() {
    this.dueDate = '';
    this.onFieldChanged();
  }

  addTag() {
    const raw = this.newTagInput.replace(/#/g, '').replace(/,/g, '').trim().toLowerCase();
    if (raw && !this.tags.includes(raw) && this.tags.length < 5) {
      this.tags.push(raw);
      this.newTagInput = '';
      this.onFieldChanged();
    }
  }

  removeTag(index: number) {
    this.tags.splice(index, 1);
    this.onFieldChanged();
  }

  insertBold() {
    this.description = (this.description || '') + '**texto em negrito**';
    this.onFieldChanged();
  }

  insertList() {
    this.description = (this.description || '') + '\n- Item da lista';
    this.onFieldChanged();
  }

  insertCode() {
    this.description = (this.description || '') + '`codigo`';
    this.onFieldChanged();
  }

  addChecklistItem() {
    const text = this.newChecklistItemText.trim();
    if (!text) return;

    const newItem: ChecklistItem = {
      id: 'chk_' + Math.random().toString(36).substring(2, 9),
      text,
      completed: false,
    };

    this.checklist.push(newItem);
    this.newChecklistItemText = '';
    this.onFieldChanged();
  }

  toggleChecklistItem(index: number) {
    this.checklist[index].completed = !this.checklist[index].completed;
    this.onFieldChanged();
  }

  removeChecklistItem(index: number) {
    this.checklist.splice(index, 1);
    this.onFieldChanged();
  }

  private executeAutoSave() {
    const metadata: Record<string, unknown> = {
      ...(this.task.metadata || {}),
    };

    if (this.workMode === 'dev') {
      if (this.devType) metadata['type'] = this.devType;
      if (this.devProject) metadata['project'] = this.devProject;
      if (this.devBranch) metadata['branch'] = this.devBranch;
      if (this.devEnvironment) metadata['environment'] = this.devEnvironment;
      if (this.devPrUrl) metadata['pr_url'] = this.devPrUrl;
    } else if (this.workMode === 'qa') {
      if (this.qaType) metadata['type'] = this.qaType;
      if (this.qaSeverity) metadata['severity'] = this.qaSeverity;
      if (this.qaEnvironment) metadata['environment'] = this.qaEnvironment;
      if (this.qaSteps) metadata['steps_to_reproduce'] = this.qaSteps;
      if (this.qaExpected) metadata['expected_result'] = this.qaExpected;
      if (this.qaActual) metadata['actual_result'] = this.qaActual;
      if (this.qaEvidenceUrl) metadata['evidence_url'] = this.qaEvidenceUrl;
    }

    const payload: UpdateTaskDto = {
      title: this.title.trim() || this.task.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      work_mode: this.workMode,
      metadata,
      due_at: this.dueDate ? new Date(this.dueDate + 'T23:59:59Z').toISOString() : null,
      tags: this.tags,
      checklist: this.checklist,
      completed_at: this.status === 'done' ? new Date().toISOString() : null,
    };

    try {
      this.taskUpdated.emit(payload);
      this.savingStatus.set('saved');
      setTimeout(() => {
        if (this.savingStatus() === 'saved') {
          this.savingStatus.set('idle');
        }
      }, 2500);
    } catch {
      this.savingStatus.set('error');
    }
  }

  isValidWebUrl(url: string | undefined): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

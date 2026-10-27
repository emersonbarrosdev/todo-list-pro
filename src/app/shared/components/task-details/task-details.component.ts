import { Component, EventEmitter, HostListener, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Task,
  QaChecklistItem,
  QaResult,
  UpdateTaskDto,
  TaskStatus,
  TaskPriority,
  CreateTaskDto,
  getProjectColor,
} from '../../../core/models/task.model';
import { Project } from '../../../core/models/project.model';
import { SafeMarkdownPipe } from '../../pipes/safe-markdown.pipe';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeMarkdownPipe],
  template: `
    <!-- Modal Backdrop -->
    <div class="details-backdrop" (click)="requestClose()">
      <!-- DIALOG MODAL FOR CREATING NEW TASK -->
      @if (isNew) {
        <div class="creation-modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="create-modal-title">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-icon">+</span>
              <h2 id="create-modal-title" class="modal-title">Nova Tarefa</h2>
            </div>
            <button type="button" class="btn-close" (click)="requestClose()" title="Fechar (Esc)">✕</button>
          </div>

          <div class="modal-body">
            <!-- Title -->
            <div class="form-group">
              <label class="form-label" for="new-task-title">Título da tarefa <span class="required">*</span></label>
              <input
                id="new-task-title"
                type="text"
                class="input title-input-box"
                [(ngModel)]="title"
                (ngModelChange)="markDirty()"
                (keyup.enter)="title.trim() && !isSaving && savingStatus() !== 'saving' && handleSave()"
                [disabled]="isSaving || savingStatus() === 'saving'"
                placeholder="Ex: Desenvolver fluxo de login no Projeto 1..."
                maxlength="200"
                autofocus
              />
            </div>

            <!-- Project Tag & Priority Row -->
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="new-task-project">Projeto / Etiqueta</label>
                <div class="project-input-group">
                  <input
                    id="new-task-project"
                    type="text"
                    class="input project-input"
                    [(ngModel)]="project"
                    (ngModelChange)="markDirty()"
                    placeholder="Ex: Projeto 1"
                    maxlength="50"
                  />
                  @if (project.trim()) {
                    <span
                      class="project-chip-preview"
                      [style.borderColor]="getProjectColor(project)"
                      [style.color]="getProjectColor(project)"
                      [style.background]="getProjectColor(project) + '18'"
                    >
                      {{ project.trim() }}
                    </span>
                  }
                </div>
              </div>

              <!-- Priority -->
              <div class="form-group">
                <label class="form-label">Prioridade</label>
                <div class="priority-pills">
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
            </div>

            <!-- Prazo / Due Date -->
            <div class="form-group">
              <label class="form-label" for="new-task-due">Prazo de conclusão</label>
              <div class="date-picker-box" (click)="openCalendar(dateInputNew)">
                <svg class="calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  #dateInputNew
                  id="new-task-due"
                  type="date"
                  class="date-native-input"
                  [(ngModel)]="dueDate"
                  (ngModelChange)="markDirty()"
                />
                @if (dueDate) {
                  <button type="button" class="btn-clear-date" (click)="clearDueDate($event)">✕</button>
                }
              </div>
            </div>

            <!-- Description -->
            <div class="form-group">
              <label class="form-label" for="new-task-desc">Descrição / Links</label>
              <textarea
                id="new-task-desc"
                class="textarea desc-textarea"
                [(ngModel)]="description"
                (ngModelChange)="markDirty()"
                placeholder="Detalhes da tarefa, links úteis (https://...)..."
                rows="4"
              ></textarea>
            </div>

            <!-- Prints & Imagens Anexadas na Criação -->
            <div class="form-group images-create-group">
              <div class="images-header">
                <label class="form-label mb-0">Prints & Telas da Tarefa ({{ images.length }})</label>
                <div class="image-actions-bar">
                  @if (justPastedMessage()) {
                    <span class="paste-feedback-badge">
                      ✓ {{ justPastedMessage() }}
                    </span>
                  }
                  <label class="btn btn-secondary btn-xs btn-browse-files" title="Procurar arquivo de imagem no computador">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    <span>Escolher arquivo</span>
                    <input type="file" accept="image/*" multiple class="sr-only" (change)="onFileSelected($event)" />
                  </label>
                </div>
              </div>

              <!-- Campo Dedicado de Captura de Print e Drop -->
              <div
                #pasteZoneNew
                class="paste-capture-box"
                [class.focused]="isPasteZoneFocused()"
                [class.dragover]="isDragging()"
                (click)="focusPasteZone(pasteZoneNew)"
                (focus)="isPasteZoneFocused.set(true)"
                (blur)="isPasteZoneFocused.set(false)"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                tabindex="0"
                role="region"
                aria-label="Campo para colar print com Ctrl+V ou arrastar imagem"
              >
                <div class="paste-box-content">
                  <div class="paste-icon-badge" [class.active]="isPasteZoneFocused()">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                      <circle cx="12" cy="14" r="3"></circle>
                    </svg>
                  </div>
                  
                  <div class="paste-box-text">
                    @if (isPasteZoneFocused()) {
                      <div class="paste-status active">
                        <span class="status-pulse-dot"></span>
                        <strong>Campo ativo! Pressione <kbd>Ctrl</kbd> + <kbd>V</kbd> para colar</strong>
                      </div>
                    } @else {
                      <div class="paste-status">
                        <strong>Clique neste campo e pressione <kbd>Ctrl</kbd> + <kbd>V</kbd> para colar o print</strong>
                      </div>
                    }
                    <span class="paste-subtext">Ou arraste arquivos de imagem diretamente para esta área</span>
                  </div>

                  <button
                    type="button"
                    class="btn-paste-clipboard"
                    (click)="handlePasteButtonClick($event)"
                    title="Colar print diretamente da área de transferência"
                  >
                    <span>📋 Colar print</span>
                  </button>
                </div>
              </div>

              <!-- Thumbnails Gallery in Creation Modal -->
              @if (images.length > 0) {
                <div class="images-gallery">
                  @for (img of images; track $index; let idx = $index) {
                    <div class="thumbnail-wrapper" (click)="openLightbox(img)" title="Clique para ampliar o print">
                      <img [src]="img" alt="Print da tarefa" class="task-thumbnail" />
                      <span class="thumb-index-tag">#{{ idx + 1 }}</span>
                      <button
                        type="button"
                        class="btn-remove-thumb"
                        (click)="removeImage(idx, $event)"
                        title="Remover anexo"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" [disabled]="isSaving || savingStatus() === 'saving'" (click)="requestClose()">Cancelar</button>
            <button
              id="btn-create-task-submit"
              type="button"
              class="btn btn-primary"
              [disabled]="!title.trim() || isSaving || savingStatus() === 'saving'"
              (click)="handleSave()"
            >
              @if (isSaving || savingStatus() === 'saving') {
                <span class="spinner-mini"></span>
                <span>Criando tarefa...</span>
              } @else {
                <span>Criar Tarefa</span>
              }
            </button>
          </div>
        </div>
      }

      <!-- RIGHT DRAWER INSPECTOR FOR EDITING CREATED TASK -->
      @if (!isNew && task) {
        <aside class="details-sheet" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="task-detail-title">
          <!-- Sheet Header with Workflow Action Bar -->
          <div class="sheet-header">
            <div class="header-flow-actions">
              <!-- Workflow Action: Backlog -> Iniciar -->
              @if (status === 'backlog') {
                <button
                  id="btn-workflow-start"
                  type="button"
                  class="btn-flow btn-flow-start"
                  (click)="transitionWorkflow('in_progress')"
                  title="Mudar status para Doing"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <span>Iniciar tarefa</span>
                </button>
              }

              <!-- Workflow Action: Doing -> Finalizar (to QA) -->
              @if (status === 'in_progress' || status === 'doing') {
                <button
                  id="btn-workflow-finish"
                  type="button"
                  class="btn-flow btn-flow-finish"
                  (click)="transitionWorkflow('qa')"
                  title="Finalizar e enviar para QA"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Finalizar → QA</span>
                </button>
              }

              <!-- Workflow Action: QA decisions -->
              @if (status === 'qa') {
                <div class="qa-quick-actions">
                  <span class="flow-label">Decisão QA:</span>
                  <button
                    type="button"
                    class="btn-qa-action btn-qa-approve"
                    (click)="triggerQaDecision('approved')"
                    title="Aprovar e migrar para Concluído"
                  >
                    ✓ Aprovado
                  </button>
                  <button
                    type="button"
                    class="btn-qa-action btn-qa-pending"
                    (click)="triggerQaDecision('pending')"
                    title="Marcar pendência e retornar para Doing"
                  >
                    ⚠ Pendente
                  </button>
                  <button
                    type="button"
                    class="btn-qa-action btn-qa-reject"
                    (click)="triggerQaDecision('rejected')"
                    title="Reprovar e retornar para Backlog"
                  >
                    ✕ Reprovado
                  </button>
                </div>
              }

              <!-- Workflow Action: Done -->
              @if (status === 'done') {
                <div class="done-status-badge">
                  <span class="badge-done-icon">✓</span>
                  <span>Concluído</span>
                  <button
                    type="button"
                    class="btn-reopen"
                    (click)="transitionWorkflow('in_progress')"
                    title="Reabrir tarefa em Doing"
                  >
                    Reabrir
                  </button>
                </div>
              }
            </div>

            <div class="header-right">
              <!-- Save Button -->
              <button
                id="btn-save-task"
                type="button"
                class="btn-save"
                [class.clean]="!isSaving && savingStatus() === 'clean'"
                [class.dirty]="!isSaving && savingStatus() === 'dirty'"
                [class.saving]="isSaving || savingStatus() === 'saving'"
                [class.saved]="savingStatus() === 'saved'"
                [class.error]="savingStatus() === 'error'"
                [disabled]="isSaving || savingStatus() === 'clean' || savingStatus() === 'saving' || !title.trim()"
                (click)="handleSave()"
                title="Salvar alterações (Ctrl+S)"
              >
                @if (isSaving || savingStatus() === 'saving') {
                  <span class="spinner-mini"></span>
                  <span>Atualizando...</span>
                } @else if (savingStatus() === 'saved') {
                  <span>✓ Salvo</span>
                } @else if (savingStatus() === 'error') {
                  <span>✕ Erro</span>
                } @else {
                  <span>Salvar</span>
                }
              </button>

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

              <button
                type="button"
                class="btn-close"
                (click)="requestClose()"
                aria-label="Fechar"
                title="Fechar (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Alert banner if rejected or pending or blocked -->
          @if (qaBlockedMessage()) {
            <div class="qa-alert-banner alert-rejected">
              <div class="alert-icon">✕</div>
              <div class="alert-content">
                <strong>Atenção:</strong>
                <span>{{ qaBlockedMessage() }}</span>
              </div>
            </div>
          } @else if (qaResult === 'rejected') {
            <div class="qa-alert-banner alert-rejected">
              <div class="alert-icon">✕</div>
              <div class="alert-content">
                <strong>Tarefa Reprovada no QA:</strong>
                <span>{{ qaNotes || 'Sem observações registradas.' }}</span>
              </div>
            </div>
          } @else if (qaResult === 'pending') {
            <div class="qa-alert-banner alert-pending">
              <div class="alert-icon">⚠</div>
              <div class="alert-content">
                <strong>QA Pendente:</strong>
                <span>{{ qaNotes || 'Aguardando pendências de validação.' }}</span>
              </div>
            </div>
          }

          <div class="sheet-body">
            <!-- Title Input (explicit bordered input box) -->
            <div class="field-block">
              <label class="field-label" for="task-detail-title">Título da Tarefa</label>
              <input
                id="task-detail-title"
                type="text"
                class="input title-input-box font-medium"
                [(ngModel)]="title"
                (ngModelChange)="markDirty()"
                placeholder="Título da tarefa..."
                maxlength="200"
              />
            </div>

            <!-- Project & Prazo Properties Grid -->
            <div class="properties-grid">
              <!-- Project Tag with Colored Outline Chip -->
              <div class="property-item">
                <span class="property-label">Projeto / Etiqueta</span>
                <div class="project-tag-input-row">
                  <input
                    type="text"
                    class="input input-sm project-edit-input"
                    [(ngModel)]="project"
                    (ngModelChange)="markDirty()"
                    placeholder="Nome do projeto..."
                  />
                  @if (project.trim()) {
                    <span
                      class="project-chip"
                      [style.borderColor]="getProjectColor(project)"
                      [style.color]="getProjectColor(project)"
                      [style.background]="getProjectColor(project) + '15'"
                    >
                      {{ project.trim() }}
                    </span>
                  }
                </div>
              </div>

              <!-- Prazo / Due Date with Calendar Trigger -->
              <div class="property-item">
                <span class="property-label">Prazo de conclusão</span>
                <div class="date-picker-box" (click)="openCalendar(dateInputEdit)">
                  <svg class="calendar-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <input
                    #dateInputEdit
                    type="date"
                    class="date-native-input"
                    [(ngModel)]="dueDate"
                    (ngModelChange)="markDirty()"
                  />
                  @if (dueDate) {
                    <button type="button" class="btn-clear-date" (click)="clearDueDate($event)">✕</button>
                  }
                </div>
              </div>

              <!-- Priority Selector -->
              <div class="property-item full-width">
                <span class="property-label">Prioridade</span>
                <div class="priority-pills">
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
            </div>

            <!-- Mandatory Reason Dialog Prompt if pending / rejected decision is in progress -->
            @if (showReasonModal()) {
              <div class="reason-modal-box">
                <div class="reason-header">
                  <strong>{{ reasonPromptTitle() }}</strong>
                </div>
                <p class="reason-subtitle">Por favor, descreva o motivo para registro no histórico:</p>
                <textarea
                  class="textarea reason-textarea"
                  [(ngModel)]="qaReasonInput"
                  rows="3"
                  placeholder="Explique detalhadamente o motivo..."
                  autofocus
                ></textarea>
                <div class="reason-actions">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="cancelReasonPrompt()">Cancelar</button>
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    [disabled]="!qaReasonInput.trim()"
                    (click)="confirmReasonPrompt()"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            }

            <!-- Description Block with Auto-linked URLs -->
            <div class="field-block description-block">
              <div class="desc-header">
                <span class="field-label">Descrição & Links</span>
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
                  placeholder="Adicione detalhes, observações ou links (https://exemplo.com)..."
                  rows="4"
                ></textarea>
              } @else {
                <div class="markdown-preview" [innerHTML]="description | safeMarkdown"></div>
              }
            </div>

            <!-- Image Attachments Section (Thumbnails + Lightbox + Dropzone) -->
            <div class="field-block images-block">
              <div class="images-header">
                <span class="field-label">Prints & Imagens ({{ images.length }})</span>
                <div class="image-actions-bar">
                  @if (justPastedMessage()) {
                    <span class="paste-feedback-badge">
                      ✓ {{ justPastedMessage() }}
                    </span>
                  }
                  <label class="btn btn-secondary btn-xs btn-browse-files" title="Procurar arquivo de imagem no computador">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    <span>Escolher arquivo</span>
                    <input type="file" accept="image/*" multiple class="sr-only" (change)="onFileSelected($event)" />
                  </label>
                </div>
              </div>

              <!-- Campo Dedicado de Captura de Print e Drop -->
              <div
                #pasteZoneEdit
                class="paste-capture-box"
                [class.focused]="isPasteZoneFocused()"
                [class.dragover]="isDragging()"
                (click)="focusPasteZone(pasteZoneEdit)"
                (focus)="isPasteZoneFocused.set(true)"
                (blur)="isPasteZoneFocused.set(false)"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                tabindex="0"
                role="region"
                aria-label="Campo para colar print com Ctrl+V ou arrastar imagem"
              >
                <div class="paste-box-content">
                  <div class="paste-icon-badge" [class.active]="isPasteZoneFocused()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                      <circle cx="12" cy="14" r="3"></circle>
                    </svg>
                  </div>
                  
                  <div class="paste-box-text">
                    @if (isPasteZoneFocused()) {
                      <div class="paste-status active">
                        <span class="status-pulse-dot"></span>
                        <strong>Campo ativo! Pressione <kbd>Ctrl</kbd> + <kbd>V</kbd> para colar</strong>
                      </div>
                    } @else {
                      <div class="paste-status">
                        <strong>Clique neste campo e pressione <kbd>Ctrl</kbd> + <kbd>V</kbd> para colar o print</strong>
                      </div>
                    }
                    <span class="paste-subtext">Ou arraste prints/imagens diretamente para esta área</span>
                  </div>

                  <button
                    type="button"
                    class="btn-paste-clipboard"
                    (click)="handlePasteButtonClick($event)"
                    title="Colar print diretamente da área de transferência"
                  >
                    <span>📋 Colar print</span>
                  </button>
                </div>
              </div>

              <!-- Thumbnails Gallery -->
              @if (images.length > 0) {
                <div class="images-gallery">
                  @for (img of images; track $index; let idx = $index) {
                    <div class="thumbnail-wrapper" (click)="openLightbox(img)" title="Clique para ampliar o print">
                      <img [src]="img" alt="Anexo da tarefa" class="task-thumbnail" />
                      <span class="thumb-index-tag">#{{ idx + 1 }}</span>
                      <button
                        type="button"
                        class="btn-remove-thumb"
                        (click)="removeImage(idx, $event)"
                        title="Remover anexo"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- QA Verification Checklist Section -->
            @if (shouldShowQaSection()) {
              <div class="qa-verification-section">
                <div class="qa-section-header">
                  <div class="qa-title-group">
                    <span class="qa-badge">QA</span>
                    <span class="qa-section-title">CHECKLIST DE VALIDAÇÃO</span>
                  </div>
                  <span class="qa-progress-count">{{ completedQaCount() }}/{{ qaChecklist.length }} validados</span>
                </div>

                <!-- FIXED INPUT AT THE TOP -->
                <div class="add-qa-item-bar-fixed">
                  <input
                    type="text"
                    class="input input-sm qa-add-input"
                    [(ngModel)]="newQaItemText"
                    (keydown.enter)="addQaItemTop()"
                    placeholder="+ Adicionar item de validação (último fica no topo)..."
                  />
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    [disabled]="!newQaItemText.trim()"
                    (click)="addQaItemTop()"
                  >
                    Adicionar
                  </button>
                </div>

                <!-- COLLAPSIBLE ACCORDION FOR CHECKLIST ITEMS -->
                <div class="qa-accordion">
                  <button
                    type="button"
                    class="accordion-trigger"
                    (click)="toggleAccordion()"
                    aria-expanded="accordionOpen()"
                  >
                    <span class="accordion-title">
                      Itens de validação ({{ qaChecklist.length }})
                    </span>
                    <svg
                      class="accordion-icon"
                      [class.rotated]="accordionOpen()"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  @if (accordionOpen()) {
                    <div class="accordion-content">
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
                            [class.completed-text]="item.completed"
                            [(ngModel)]="item.text"
                            (ngModelChange)="markDirty()"
                            placeholder="Item de validação..."
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

                      @if (qaChecklist.length === 0) {
                        <div class="qa-empty-hint">Nenhum item adicionado ainda. Adicione acima.</div>
                      }
                    </div>
                  }
                </div>

                <!-- QA Observação / Notes -->
                <div class="qa-notes-block">
                  <label class="qa-notes-label">Observações de QA</label>
                  <input
                    type="text"
                    class="input input-sm"
                    [(ngModel)]="qaNotes"
                    (ngModelChange)="markDirty()"
                    placeholder="Ex: Validado em produção, requisitos atendidos..."
                  />
                </div>
              </div>
            }
          </div>
        </aside>
      }
    </div>

    <!-- LIGHTBOX MODAL FOR IMAGES -->
    @if (lightboxImage()) {
      <div class="lightbox-overlay" (click)="closeLightbox()">
        <div class="lightbox-container" (click)="$event.stopPropagation()">
          <button type="button" class="btn-lightbox-close" (click)="closeLightbox()">✕</button>
          <img [src]="lightboxImage()" alt="Visualização expandida" class="lightbox-image" />
        </div>
      </div>
    }
  `,
  styles: [`
    .details-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(5px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      align-items: stretch;
      animation: fadeInBackdrop 0.15s ease-out;
    }

    /* CREATION MODAL (Centered dialog) */
    .creation-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 92%;
      max-width: 580px;
      max-height: 90vh;
      background: #14141E;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      z-index: 1010;
      animation: popIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-header {
      padding: 1.1rem 1.4rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #181826;
      border-top-left-radius: inherit;
      border-top-right-radius: inherit;
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .modal-icon {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: var(--primary);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }

    .modal-body {
      padding: 1.25rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: calc(90vh - 140px);
      overflow-y: auto;
    }

    .modal-footer {
      padding: 0.9rem 1.4rem;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #181826;
      border-bottom-left-radius: inherit;
      border-bottom-right-radius: inherit;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .form-label .required {
      color: #EF4444;
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }

    /* RIGHT DRAWER SHEET FOR EDITING CREATED TASK */
    .details-sheet {
      width: 100%;
      max-width: 600px;
      height: 100%;
      background: #14141E;
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 35px rgba(0, 0, 0, 0.7);
      animation: slideInSheet 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sheet-header {
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
      background: #161624;
      flex-shrink: 0;
    }

    .header-flow-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-shrink: 0;
    }

    /* Flow Action Buttons */
    .btn-flow {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-sm, 6px);
      font-size: 0.8125rem;
      font-weight: 700;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-flow-start {
      background: #3B82F6;
      color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    }

    .btn-flow-start:hover {
      background: #2563EB;
    }

    .btn-flow-finish {
      background: #F59E0B;
      color: #000000;
      font-weight: 800;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }

    .btn-flow-finish:hover {
      background: #D97706;
    }

    .qa-quick-actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .flow-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .btn-qa-action {
      padding: 0.3rem 0.65rem;
      border-radius: var(--radius-sm, 6px);
      font-size: 0.75rem;
      font-weight: 700;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-qa-approve {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10B981;
      color: #34D399;
    }

    .btn-qa-approve:hover {
      background: #10B981;
      color: #FFFFFF;
    }

    .btn-qa-pending {
      background: rgba(245, 158, 11, 0.2);
      border-color: #F59E0B;
      color: #FBBF24;
    }

    .btn-qa-pending:hover {
      background: #F59E0B;
      color: #000000;
    }

    .btn-qa-reject {
      background: rgba(239, 68, 68, 0.2);
      border-color: #EF4444;
      color: #F87171;
    }

    .btn-qa-reject:hover {
      background: #EF4444;
      color: #FFFFFF;
    }

    .done-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 9999px;
      color: #34D399;
      font-size: 0.8125rem;
      font-weight: 700;
    }

    .btn-reopen {
      background: transparent;
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #A7F3D0;
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 0.25rem;
    }

    .btn-reopen:hover {
      background: rgba(16, 185, 129, 0.3);
    }

    /* Save button */
    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.9rem;
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

    .btn-delete, .btn-close {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.4rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .btn-delete:hover {
      color: #F87171;
      background: rgba(239, 68, 68, 0.1);
    }

    .btn-close:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.08);
    }

    /* Alert Banners */
    .qa-alert-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.8125rem;
      border-bottom: 1px solid var(--border);
    }

    .qa-alert-banner.alert-rejected {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
    }

    .qa-alert-banner.alert-pending {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.3);
      color: #FCD34D;
    }

    .alert-icon {
      font-weight: 800;
      font-size: 1rem;
    }

    .alert-content {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    /* Sheet Body */
    .sheet-body {
      padding: 1.25rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      flex: 1;
    }

    /* Explicit Bordered Input Box for Title */
    .title-input-box {
      width: 100%;
      background: #0F0F17 !important;
      border: 1.5px solid rgba(255, 255, 255, 0.16) !important;
      border-radius: var(--radius-md, 8px) !important;
      padding: 0.65rem 0.85rem !important;
      font-size: 0.9375rem !important;
      font-weight: 600 !important;
      color: #FFFFFF !important;
      transition: all var(--transition-fast);
    }

    .title-input-box:focus {
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25) !important;
    }

    /* Project chip and input */
    .project-input-group, .project-tag-input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .project-chip, .project-chip-preview {
      display: inline-flex;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      border-width: 1.5px;
      border-style: solid;
      border-radius: 9999px;
      padding: 0.2rem 0.65rem;
      letter-spacing: 0.02em;
    }

    /* Prazo Native Calendar Box */
    .date-picker-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--surface-secondary, #1B1B28);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.35rem 0.65rem;
      cursor: pointer;
      position: relative;
    }

    .calendar-icon {
      color: var(--primary);
      flex-shrink: 0;
    }

    .date-native-input {
      background: transparent;
      border: none;
      color: var(--text);
      font-family: inherit;
      font-size: 0.8125rem;
      cursor: pointer;
      width: 100%;
    }

    .date-native-input:focus {
      outline: none;
    }

    .btn-clear-date {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8125rem;
      padding: 0.2rem;
    }

    /* Properties Grid */
    .properties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }

    .property-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
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

    /* Priority Pills */
    .priority-pills {
      display: flex;
      gap: 0.35rem;
    }

    .pill-btn {
      flex: 1;
      padding: 0.35rem 0.6rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
      text-align: center;
    }

    .pill-btn.pill-low.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3B82F6;
      color: #93C5FD;
    }

    .pill-btn.pill-normal.active {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10B981;
      color: #6EE7B7;
    }

    .pill-btn.pill-high.active {
      background: rgba(239, 68, 68, 0.2);
      border-color: #EF4444;
      color: #FCA5A5;
    }

    /* Mandatory Reason Prompt */
    .reason-modal-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1.5px solid #EF4444;
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      animation: fadeIn 0.15s ease-out;
    }

    .reason-header {
      font-size: 0.875rem;
      color: #FFFFFF;
    }

    .reason-subtitle {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .reason-textarea {
      font-size: 0.8125rem;
    }

    .reason-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    /* Description */
    .description-block {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .desc-header, .images-header {
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
      min-height: 80px;
      padding: 0.65rem 0.85rem;
      background: var(--surface-secondary, #1B1B28);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text);
    }

    /* Image Attachments Gallery */
    .images-block {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .images-create-group {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    kbd {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 4px;
      padding: 0.1rem 0.35rem;
      font-size: 0.75rem;
      font-family: inherit;
      color: #E2E8F0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .paste-capture-box {
      border: 1.5px dashed rgba(167, 139, 250, 0.35);
      background: rgba(167, 139, 250, 0.04);
      border-radius: var(--radius-sm, 8px);
      padding: 0.85rem 1rem;
      transition: all var(--transition-fast);
      cursor: pointer;
      outline: none;
    }

    .paste-capture-box:hover,
    .paste-capture-box.focused,
    .paste-capture-box:focus {
      border-color: var(--primary, #8B5CF6);
      background: rgba(139, 92, 246, 0.1);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
    }

    .paste-capture-box.dragover {
      border-color: #34D399;
      background: rgba(16, 185, 129, 0.12);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
    }

    .paste-box-content {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .paste-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(139, 92, 246, 0.15);
      color: #C4B5FD;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all var(--transition-fast);
    }

    .paste-icon-badge.active {
      background: var(--primary);
      color: #FFFFFF;
      box-shadow: 0 2px 10px rgba(139, 92, 246, 0.4);
    }

    .paste-box-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .paste-status {
      font-size: 0.8125rem;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .paste-status.active {
      color: #C4B5FD;
    }

    .status-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34D399;
      box-shadow: 0 0 6px #34D399;
      animation: pulse 1.2s infinite;
      display: inline-block;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .paste-subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .btn-paste-clipboard {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: var(--radius-sm);
      color: #E2E8F0;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      transition: all var(--transition-fast);
    }

    .btn-paste-clipboard:hover {
      background: var(--primary);
      color: #FFFFFF;
      border-color: var(--primary);
    }

    .image-actions-bar {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .btn-browse-files {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      position: relative;
    }

    .paste-feedback-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #34D399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      animation: fadeIn 0.15s ease-out;
    }

    .thumb-index-tag {
      position: absolute;
      bottom: 2px;
      left: 2px;
      background: rgba(0, 0, 0, 0.75);
      color: #E2E8F0;
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
      pointer-events: none;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .mb-0 {
      margin-bottom: 0 !important;
    }

    .btn-add-img {
      cursor: pointer;
      position: relative;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }

    .images-gallery {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .thumbnail-wrapper {
      position: relative;
      width: 68px;
      height: 68px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      cursor: pointer;
      transition: transform var(--transition-fast);
    }

    .thumbnail-wrapper:hover {
      transform: scale(1.05);
      border-color: var(--primary);
    }

    .task-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-remove-thumb {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.75);
      color: #FFFFFF;
      border: none;
      font-size: 0.6875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    /* QA Verification Section with Top Fixed Input & Accordion */
    .qa-verification-section {
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .qa-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .qa-progress-count {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Fixed Input at the Top */
    .add-qa-item-bar-fixed {
      display: flex;
      gap: 0.5rem;
    }

    .qa-add-input {
      flex: 1;
    }

    /* Accordion */
    .qa-accordion {
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: rgba(0, 0, 0, 0.2);
    }

    .accordion-trigger {
      width: 100%;
      padding: 0.55rem 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .accordion-trigger:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .accordion-icon {
      transition: transform 0.2s ease;
      color: var(--text-muted);
    }

    .accordion-icon.rotated {
      transform: rotate(180deg);
    }

    .accordion-content {
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      max-height: 240px;
      overflow-y: auto;
    }

    .qa-check-item {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.25rem 0;
    }

    .qa-check-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text);
      font-size: 0.8125rem;
      border-bottom: 1px dashed transparent;
      padding: 0.2rem 0;
    }

    .qa-check-input:focus {
      outline: none;
      border-bottom-color: var(--primary);
    }

    .qa-check-input.completed-text {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .btn-remove-qa {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0.2rem;
    }

    .btn-remove-qa:hover {
      color: #F87171;
    }

    .qa-empty-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      padding: 0.5rem 0;
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

    /* LIGHTBOX OVERLAY */
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeIn 0.15s ease-out;
    }

    .lightbox-container {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .lightbox-image {
      max-width: 100%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
    }

    .btn-lightbox-close {
      position: absolute;
      top: -36px;
      right: 0;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #FFFFFF;
      font-size: 1.25rem;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .btn-lightbox-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes popIn {
      from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    @keyframes slideInSheet {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @media (max-width: 640px) {
      .details-sheet {
        max-width: 100%;
      }
      .properties-grid, .form-row-2 {
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
  @Input() isSaving = false;

  @Output() save = new EventEmitter<UpdateTaskDto | CreateTaskDto>();
  @Output() delete = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  title = '';
  project = '';
  projectId = '';
  description = '';
  status: TaskStatus = 'backlog';
  priority: TaskPriority = 'normal';
  dueDate = '';
  qaChecklist: QaChecklistItem[] = [];
  qaResult: QaResult = 'not_started';
  qaNotes = '';
  images: string[] = [];

  newQaItemText = '';
  isDragging = signal(false);
  isPasteZoneFocused = signal(false);
  justPastedMessage = signal<string | null>(null);
  showMarkdownPreview = signal(false);
  accordionOpen = signal(true);
  lightboxImage = signal<string | null>(null);
  savingStatus = signal<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  qaBlockedMessage = signal<string | null>(null);

  // Reason prompt for rejected / pending transitions
  showReasonModal = signal(false);
  pendingDecision = signal<'rejected' | 'pending' | null>(null);
  reasonPromptTitle = signal('');
  qaReasonInput = '';

  getProjectColor = getProjectColor;

  ngOnInit(): void {
    if (this.task) {
      this.title = this.task.title || '';
      this.project = this.task.project || (this.task as any).project_name || '';
      this.projectId = this.task.project_id || this.defaultProjectId || '';
      this.description = this.task.description || '';
      this.status = this.task.status || 'backlog';
      this.priority = this.task.priority || 'normal';
      this.dueDate = this.task.due_at ? this.task.due_at.substring(0, 10) : '';
      this.qaChecklist = this.task.qa_checklist ? [...this.task.qa_checklist] : [];
      this.qaResult = this.task.qa_result || 'not_started';
      this.qaNotes = this.task.qa_notes || '';
      this.images = this.task.images ? [...this.task.images] : [];
    } else {
      this.project = '';
      this.projectId = this.defaultProjectId || '';
      this.status = 'backlog';
      this.qaResult = 'not_started';
    }
    this.savingStatus.set(this.isNew ? 'dirty' : 'clean');
  }

  completedQaCount(): number {
    return this.qaChecklist.filter((i) => i.completed).length;
  }

  markDirty(): void {
    this.qaBlockedMessage.set(null);
    if (this.savingStatus() !== 'saving') {
      this.savingStatus.set('dirty');
    }
  }

  setStatus(newStatus: any): void {
    if (newStatus === 'done' && this.qaResult === 'rejected') {
      this.qaBlockedMessage.set('Não é possível concluir: o QA foi reprovado.');
      return;
    }
    this.qaBlockedMessage.set(null);
    this.status = newStatus === 'ready_for_test' ? 'qa' : newStatus;
    this.markDirty();
  }

  setPriority(p: TaskPriority): void {
    this.priority = p;
    this.markDirty();
  }

  setQaResult(res: QaResult): void {
    this.qaResult = res;
    this.markDirty();
  }

  shouldShowQaSection(): boolean {
    return (
      this.status === 'qa' ||
      (this.status as any) === 'ready_for_test' ||
      (this.qaChecklist && this.qaChecklist.length > 0) ||
      this.qaResult !== 'not_started'
    );
  }

  openCalendar(inputEl: HTMLInputElement): void {
    try {
      if (typeof (inputEl as any).showPicker === 'function') {
        (inputEl as any).showPicker();
      } else {
        inputEl.focus();
      }
    } catch {
      inputEl.focus();
    }
  }

  clearDueDate(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.dueDate = '';
    this.markDirty();
  }

  toggleAccordion(): void {
    this.accordionOpen.update((v) => !v);
  }

  // Prepends new QA checklist item at the TOP (unshift)
  addQaItemTop(): void {
    const text = this.newQaItemText.trim();
    if (!text) return;

    this.qaChecklist.unshift({
      id: 'qa_' + Math.random().toString(36).substring(2, 9),
      text,
      completed: false,
    });
    this.newQaItemText = '';
    this.accordionOpen.set(true);
    this.markDirty();
  }

  addQaItem(): void {
    this.addQaItemTop();
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

  // Drag & drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const file = event.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          this.processImageFile(file);
        }
      }
    }
  }

  focusPasteZone(targetEl?: HTMLElement): void {
    this.isPasteZoneFocused.set(true);
    if (targetEl) {
      targetEl.focus();
    }
  }

  showPastedFeedback(msg: string): void {
    this.justPastedMessage.set(msg);
    setTimeout(() => {
      if (this.justPastedMessage() === msg) {
        this.justPastedMessage.set(null);
      }
    }, 2800);
  }

  // Quick button handler for reading from clipboard via Clipboard API
  async handlePasteButtonClick(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
        const items = await navigator.clipboard.read();
        let found = false;
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const file = new File([blob], `print-${Date.now()}.png`, { type });
              this.processImageFile(file);
              found = true;
              this.showPastedFeedback('Print colado com sucesso!');
              break;
            }
          }
        }
        if (found) return;
      }
    } catch {
      // Permission blocked or unsupported, fallback to focus paste zone
    }
    this.focusPasteZone();
  }

  // Global & field clipboard paste handler (Ctrl+V)
  @HostListener('document:paste', ['$event'])
  handlePaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    let hasImage = false;

    // 1. Check clipboard items
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            hasImage = true;
            this.processImageFile(file);
          }
        }
      }
    }

    // 2. Check clipboard files fallback (Snipping Tool, Paint, Windows clipboard)
    if (!hasImage && clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const file = clipboardData.files[i];
        if (file.type && file.type.startsWith('image/')) {
          hasImage = true;
          this.processImageFile(file);
        }
      }
    }

    if (hasImage) {
      event.preventDefault();
      event.stopPropagation();
      this.showPastedFeedback('Print colado com sucesso!');
    }
  }

  // File picker handler for image upload (supports multiple files)
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        this.processImageFile(input.files[i]);
      }
      input.value = '';
    }
  }

  // Process and optimize screenshot/image (resizes large 4K/high-res prints to prevent storage bloat)
  processImageFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
            try {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const optimized = canvas.toDataURL('image/jpeg', 0.88);
                this.images.push(optimized);
                this.markDirty();
                return;
              }
            } catch {
              // fallback below
            }
          }
          this.images.push(rawDataUrl);
          this.markDirty();
        };
        img.onerror = () => {
          this.images.push(rawDataUrl);
          this.markDirty();
        };
        img.src = rawDataUrl;
      } else {
        this.images.push(rawDataUrl);
        this.markDirty();
      }
    };
    reader.readAsDataURL(file);
  }

  removeImage(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.images.splice(index, 1);
    this.markDirty();
  }

  openLightbox(url: string): void {
    this.lightboxImage.set(url);
  }

  closeLightbox(): void {
    this.lightboxImage.set(null);
  }

  // Workflow Action buttons
  transitionWorkflow(targetStatus: TaskStatus): void {
    this.status = targetStatus;
    if (targetStatus === 'in_progress' || (targetStatus as any) === 'doing' || targetStatus === 'qa') {
      this.qaResult = 'not_started';
    }
    this.markDirty();
    this.handleSave();
  }

  // QA Decision handler:
  // Approved -> moves to Done automatically!
  // Pending -> prompt mandatory reason -> moves to In Progress with Pending chip
  // Rejected -> prompt mandatory reason -> moves to Backlog with Rejected chip
  triggerQaDecision(decision: 'approved' | 'pending' | 'rejected'): void {
    if (decision === 'approved') {
      this.qaResult = 'approved';
      this.status = 'done';
      this.markDirty();
      this.handleSave();
      return;
    }

    if (decision === 'pending') {
      this.pendingDecision.set('pending');
      this.reasonPromptTitle.set('Motivo da Pendência (Retornará para Doing)');
      this.qaReasonInput = this.qaNotes || '';
      this.showReasonModal.set(true);
      return;
    }

    if (decision === 'rejected') {
      this.pendingDecision.set('rejected');
      this.reasonPromptTitle.set('Motivo da Reprovação (Retornará para Backlog)');
      this.qaReasonInput = this.qaNotes || '';
      this.showReasonModal.set(true);
      return;
    }
  }

  cancelReasonPrompt(): void {
    this.showReasonModal.set(false);
    this.pendingDecision.set(null);
    this.qaReasonInput = '';
  }

  confirmReasonPrompt(): void {
    const reason = this.qaReasonInput.trim();
    if (!reason) return;

    const decision = this.pendingDecision();
    if (decision === 'pending') {
      this.qaResult = 'pending';
      this.qaNotes = reason;
      this.status = 'in_progress'; // returns to In Progress
    } else if (decision === 'rejected') {
      this.qaResult = 'rejected';
      this.qaNotes = reason;
      this.status = 'backlog'; // returns to Backlog
    }

    this.showReasonModal.set(false);
    this.pendingDecision.set(null);
    this.markDirty();
    this.handleSave();
  }

  handleSave(): void {
    const cleanTitle = this.title.trim();
    if (!cleanTitle || this.isSaving || this.savingStatus() === 'saving') return;

    if (this.status === 'done' && this.qaResult === 'rejected') {
      this.qaBlockedMessage.set('Não é possível concluir: o QA foi reprovado.');
      return;
    }

    this.savingStatus.set('saving');

    const payload: any = {
      project: this.project.trim(),
      project_id: this.projectId,
      title: cleanTitle,
      description: this.description,
      status: this.status,
      priority: this.priority,
      due_at: this.dueDate ? new Date(this.dueDate + 'T23:59:59').toISOString() : null,
      qa_checklist: this.qaChecklist,
      qa_result: this.qaResult,
      qa_notes: this.qaNotes,
      images: this.images,
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
      if (this.lightboxImage()) {
        this.closeLightbox();
        return;
      }
      if (this.showReasonModal()) {
        this.cancelReasonPrompt();
        return;
      }
      this.requestClose();
    }
  }
}

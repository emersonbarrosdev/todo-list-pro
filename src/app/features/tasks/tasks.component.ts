import { Component, OnInit, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { OnboardingComponent } from '../../shared/components/onboarding/onboarding.component';
import { TaskDetailsComponent } from '../../shared/components/task-details/task-details.component';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';
import { Task, TaskStatus, TaskPriority, CreateTaskDto, UpdateTaskDto } from '../../core/models/task.model';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, OnboardingComponent, TaskDetailsComponent],
  template: `
    <div class="tasks-layout">
      <!-- Shell Header -->
      <app-header
        [projects]="projects()"
        [selectedProjectId]="selectedProjectId()"
        [searchQuery]="searchQuery()"
        (projectChanged)="onProjectChange($event)"
        (newProjectClicked)="openNewProjectModal()"
        (searchChanged)="onSearchChange($event)"
        (newTaskClicked)="openNewTaskModal()"
      ></app-header>

      <!-- Main Workspace -->
      <main class="main-content">
        <div class="app-container">
          <!-- Top Bar: Summary and Refresh Button ONLY (NO duplicate "+ Nova tarefa") -->
          <div class="workspace-header">
            <div class="workspace-top-bar">
              <div class="summary-meta">
                <span class="summary-count">
                  <strong>{{ activeCount() }}</strong> {{ activeCount() === 1 ? 'tarefa ativa' : 'tarefas ativas' }}
                </span>
                <span class="summary-divider">·</span>
                <span class="summary-test">
                  <strong>{{ readyForTestCount() }}</strong> em teste
                </span>
                <span class="summary-divider">·</span>
                <span class="summary-done">{{ doneCount() }} concluídas</span>
              </div>

              <div class="top-bar-actions">
                <!-- Discrete Refresh Button -->
                <button
                  id="btn-refresh-tasks"
                  type="button"
                  class="btn-refresh"
                  (click)="refreshCurrentProject(true)"
                  [disabled]="isLoading()"
                  title="Recarregar tarefas do servidor"
                >
                  <svg [class.spin]="isLoading()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            <!-- Compact Client-Side Filter & Sorting Bar -->
            <div class="filters-bar">
              <!-- Quick Status Segmented Pills -->
              <div class="status-pills" role="tablist">
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'all'"
                  (click)="setStatusFilter('all')"
                >
                  Todas ({{ totalCount() }})
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'backlog'"
                  (click)="setStatusFilter('backlog')"
                >
                  Backlog
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'in_progress'"
                  (click)="setStatusFilter('in_progress')"
                >
                  Em andamento
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'ready_for_test'"
                  (click)="setStatusFilter('ready_for_test')"
                >
                  Pronto para testar
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'done'"
                  (click)="setStatusFilter('done')"
                >
                  Concluídas ({{ doneCount() }})
                </button>
              </div>

              <!-- Secondary Filters & Sorting (100% In-Memory) -->
              <div class="secondary-filters">
                <!-- Priority Filter Dropdown -->
                <select
                  class="select select-compact"
                  [value]="priorityFilter()"
                  (change)="onPriorityFilterChange($event)"
                  aria-label="Filtrar por prioridade"
                >
                  <option value="all">Prioridade: Todas</option>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baixa</option>
                </select>

                <!-- Sorting Dropdown -->
                <select
                  class="select select-compact"
                  [value]="sortBy()"
                  (change)="onSortByChange($event)"
                  aria-label="Ordenar tarefas"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="oldest">Mais antigas</option>
                  <option value="due_date">Prazo</option>
                  <option value="priority">Prioridade</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Tasks Sections View -->
          <div class="tasks-container">
            @if (isLoading()) {
              <div class="skeleton-list" aria-busy="true">
                <div class="skeleton-row skeleton"></div>
                <div class="skeleton-row skeleton"></div>
                <div class="skeleton-row skeleton"></div>
              </div>
            } @else if (filteredTasks().length === 0) {
              <!-- Empty State -->
              <div class="empty-state">
                <div class="empty-icon">✓</div>
                <h3 class="empty-title">Tudo organizado!</h3>
                <p class="empty-subtitle">Nenhuma tarefa encontrada neste projeto ou com os filtros atuais.</p>
                <button
                  id="btn-empty-new-task"
                  type="button"
                  class="btn btn-primary"
                  (click)="openNewTaskModal()"
                >
                  + Criar primeira tarefa
                </button>
              </div>
            } @else if (statusFilter() !== 'all') {
              <!-- Single Filtered List -->
              <div class="task-list">
                @for (task of filteredTasks(); track task.id) {
                  <div
                    class="task-row"
                    [class.task-done]="task.status === 'done'"
                    (click)="openTaskDetails(task)"
                  >
                    <div class="task-left">
                      <span
                        class="status-dot"
                        [ngClass]="'status-' + task.status"
                        [title]="getStatusLabel(task.status)"
                      ></span>
                      <span class="task-title">{{ task.title }}</span>
                    </div>

                    <div class="task-right">
                      @if (selectedProjectId() === 'all' && task.project_name) {
                        <span class="project-tag">{{ task.project_name }}</span>
                      }
                      @if (task.priority !== 'normal') {
                        <span class="priority-tag" [ngClass]="'priority-' + task.priority">
                          {{ task.priority === 'high' ? 'Alta' : 'Baixa' }}
                        </span>
                      }
                      @if (task.due_at) {
                        <span class="due-tag" [class.overdue]="isOverdue(task.due_at)">
                          {{ formatDueDate(task.due_at) }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <!-- Sections: BACKLOG, EM ANDAMENTO, PRONTO PARA TESTAR, CONCLUÍDO -->
              <div class="workflow-sections">
                <!-- Section 1: BACKLOG -->
                <div class="workflow-section">
                  <div class="section-title-bar">
                    <span class="section-dot dot-backlog"></span>
                    <span class="section-heading">BACKLOG</span>
                    <span class="section-counter">({{ backlogTasks().length }})</span>
                  </div>
                  <div class="section-tasks">
                    @for (task of backlogTasks(); track task.id) {
                      <div class="task-row" (click)="openTaskDetails(task)">
                        <div class="task-left">
                          <span class="task-title">{{ task.title }}</span>
                        </div>
                        <div class="task-right">
                          @if (selectedProjectId() === 'all' && task.project_name) {
                            <span class="project-tag">{{ task.project_name }}</span>
                          }
                          @if (task.priority !== 'normal') {
                            <span class="priority-tag" [ngClass]="'priority-' + task.priority">
                              {{ task.priority === 'high' ? 'Alta' : 'Baixa' }}
                            </span>
                          }
                          @if (task.due_at) {
                            <span class="due-tag" [class.overdue]="isOverdue(task.due_at)">
                              {{ formatDueDate(task.due_at) }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                    @if (backlogTasks().length === 0) {
                      <div class="section-empty">Nenhuma tarefa no backlog</div>
                    }
                  </div>
                </div>

                <!-- Section 2: EM ANDAMENTO -->
                <div class="workflow-section">
                  <div class="section-title-bar">
                    <span class="section-dot dot-in-progress"></span>
                    <span class="section-heading">EM ANDAMENTO</span>
                    <span class="section-counter">({{ inProgressTasks().length }})</span>
                  </div>
                  <div class="section-tasks">
                    @for (task of inProgressTasks(); track task.id) {
                      <div class="task-row" (click)="openTaskDetails(task)">
                        <div class="task-left">
                          <span class="task-title">{{ task.title }}</span>
                        </div>
                        <div class="task-right">
                          @if (selectedProjectId() === 'all' && task.project_name) {
                            <span class="project-tag">{{ task.project_name }}</span>
                          }
                          @if (task.priority !== 'normal') {
                            <span class="priority-tag" [ngClass]="'priority-' + task.priority">
                              {{ task.priority === 'high' ? 'Alta' : 'Baixa' }}
                            </span>
                          }
                          @if (task.due_at) {
                            <span class="due-tag" [class.overdue]="isOverdue(task.due_at)">
                              {{ formatDueDate(task.due_at) }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                    @if (inProgressTasks().length === 0) {
                      <div class="section-empty">Nenhuma tarefa em andamento</div>
                    }
                  </div>
                </div>

                <!-- Section 3: PRONTO PARA TESTAR -->
                <div class="workflow-section">
                  <div class="section-title-bar">
                    <span class="section-dot dot-ready-for-test"></span>
                    <span class="section-heading">PRONTO PARA TESTAR</span>
                    <span class="section-counter">({{ readyForTestTasks().length }})</span>
                  </div>
                  <div class="section-tasks">
                    @for (task of readyForTestTasks(); track task.id) {
                      <div class="task-row highlight-qa" (click)="openTaskDetails(task)">
                        <div class="task-left">
                          <span class="qa-mini-badge" [ngClass]="'qa-' + task.qa_result">
                            {{ task.qa_result === 'approved' ? 'Aprovado' : task.qa_result === 'rejected' ? 'Reprovado' : 'QA' }}
                          </span>
                          <span class="task-title">{{ task.title }}</span>
                        </div>
                        <div class="task-right">
                          @if (selectedProjectId() === 'all' && task.project_name) {
                            <span class="project-tag">{{ task.project_name }}</span>
                          }
                          @if (task.priority !== 'normal') {
                            <span class="priority-tag" [ngClass]="'priority-' + task.priority">
                              {{ task.priority === 'high' ? 'Alta' : 'Baixa' }}
                            </span>
                          }
                          @if (task.due_at) {
                            <span class="due-tag" [class.overdue]="isOverdue(task.due_at)">
                              {{ formatDueDate(task.due_at) }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                    @if (readyForTestTasks().length === 0) {
                      <div class="section-empty">Nenhuma tarefa pronta para testar</div>
                    }
                  </div>
                </div>

                <!-- Section 4: CONCLUÍDO -->
                <div class="workflow-section">
                  <div class="section-title-bar">
                    <span class="section-dot dot-done"></span>
                    <span class="section-heading">CONCLUÍDO</span>
                    <span class="section-counter">({{ doneTasks().length }})</span>
                  </div>
                  <div class="section-tasks">
                    @for (task of doneTasks(); track task.id) {
                      <div class="task-row task-done" (click)="openTaskDetails(task)">
                        <div class="task-left">
                          <span class="task-title">{{ task.title }}</span>
                        </div>
                        <div class="task-right">
                          @if (selectedProjectId() === 'all' && task.project_name) {
                            <span class="project-tag">{{ task.project_name }}</span>
                          }
                        </div>
                      </div>
                    }
                    @if (doneTasks().length === 0) {
                      <div class="section-empty">Nenhuma tarefa concluída</div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </main>

      <!-- Task Details Sheet (Manual Save, Zero Autosave) -->
      @if (selectedTask() || isCreatingTask()) {
        <app-task-details
          [task]="selectedTask()"
          [projects]="projects()"
          [defaultProjectId]="selectedProjectId() === 'all' ? (projects()[0]?.id || '') : selectedProjectId()"
          [isNew]="isCreatingTask()"
          (save)="handleSaveTask($event)"
          (delete)="handleDeleteTask($event)"
          (close)="closeTaskDetails()"
        ></app-task-details>
      }

      <!-- New Project Modal -->
      @if (showNewProjectModal()) {
        <div class="modal-backdrop" (click)="showNewProjectModal.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3 class="modal-title">+ Novo Projeto</h3>
            <p class="modal-desc">Crie um projeto pessoal para organizar suas tarefas.</p>

            <div class="modal-form">
              <label class="input-label" for="new-project-name">Nome do projeto</label>
              <input
                id="new-project-name"
                type="text"
                class="input"
                [(ngModel)]="newProjectName"
                placeholder="Ex: Narrativa Studio, TODO PRO..."
                autofocus
              />

              <label class="input-label" for="new-project-desc">Descrição (opcional)</label>
              <input
                id="new-project-desc"
                type="text"
                class="input"
                [(ngModel)]="newProjectDescription"
                placeholder="Ex: Estúdio de áudio e narração..."
              />

              <div class="modal-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="showNewProjectModal.set(false)"
                >
                  Cancelar
                </button>
                <button
                  id="btn-create-project-submit"
                  type="button"
                  class="btn btn-primary"
                  [disabled]="!newProjectName.trim() || isCreatingProject()"
                  (click)="handleCreateProject()"
                >
                  {{ isCreatingProject() ? 'Criando...' : 'Criar projeto' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Onboarding Modal if user has zero projects -->
      @if (showOnboarding()) {
        <app-onboarding (projectCreated)="handleOnboardingProject($event)"></app-onboarding>
      }
    </div>
  `,
  styles: [`
    .tasks-layout {
      min-height: 100vh;
      background: var(--bg);
      display: flex;
      flex-direction: column;
    }

    .main-content {
      flex: 1;
      padding: 1.5rem 0 3rem;
    }

    .app-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1.25rem;
    }

    .workspace-header {
      margin-bottom: 1.5rem;
    }

    .workspace-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .summary-meta {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .summary-meta strong {
      color: #FFFFFF;
    }

    .summary-divider {
      color: var(--text-muted);
    }

    .summary-test strong {
      color: #FCD34D;
    }

    .summary-done {
      color: #6EE7B7;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-refresh:hover {
      background: var(--surface-hover);
      color: var(--text);
      border-color: var(--text-muted);
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .spin {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    .status-pills {
      display: flex;
      gap: 0.35rem;
      overflow-x: auto;
    }

    .filter-pill {
      padding: 0.3rem 0.7rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);
    }

    .filter-pill:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .filter-pill.active {
      background: rgba(139, 92, 246, 0.2);
      border-color: var(--primary);
      color: #C4B5FD;
    }

    .secondary-filters {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Workflow Sections: BACKLOG, EM ANDAMENTO, PRONTO PARA TESTAR, CONCLUÍDO */
    .workflow-sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .workflow-section {
      background: #14141E;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .section-title-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 1rem;
      background: #171725;
      border-bottom: 1px solid var(--border);
    }

    .section-heading {
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #FFFFFF;
    }

    .section-counter {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .section-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-backlog { background: #94A3B8; }
    .dot-in-progress { background: #60A5FA; }
    .dot-ready-for-test { background: #F59E0B; }
    .dot-done { background: #10B981; }

    .section-tasks {
      display: flex;
      flex-direction: column;
    }

    .section-empty {
      padding: 1.25rem 1rem;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    /* Compact Task Rows */
    .task-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .task-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 1rem;
      background: #14141E;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .task-row:last-child {
      border-bottom: none;
    }

    .task-row:hover {
      background: #181827;
    }

    .task-row.highlight-qa {
      background: rgba(245, 158, 11, 0.03);
    }

    .task-row.highlight-qa:hover {
      background: rgba(245, 158, 11, 0.06);
    }

    .task-row.task-done .task-title {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .task-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-backlog { background: #94A3B8; }
    .status-in_progress { background: #60A5FA; }
    .status-ready_for_test { background: #F59E0B; }
    .status-done { background: #10B981; }

    .task-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .project-tag {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      background: rgba(139, 92, 246, 0.12);
      color: #C4B5FD;
      border: 1px solid rgba(139, 92, 246, 0.25);
    }

    .priority-tag {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .priority-high {
      background: rgba(239, 68, 68, 0.15);
      color: #FCA5A5;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .priority-low {
      background: rgba(107, 114, 128, 0.15);
      color: #9CA3AF;
      border: 1px solid var(--border);
    }

    .due-tag {
      font-size: 0.6875rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: var(--surface-secondary);
      color: var(--text-secondary);
      border: 1px solid var(--border);
    }

    .due-tag.overdue {
      background: rgba(239, 68, 68, 0.15);
      color: #F87171;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .qa-mini-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .qa-mini-badge.qa-pending {
      background: rgba(245, 158, 11, 0.2);
      color: #FCD34D;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .qa-mini-badge.qa-approved {
      background: rgba(16, 185, 129, 0.2);
      color: #6EE7B7;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    .qa-mini-badge.qa-rejected {
      background: rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3.5rem 1.5rem;
      background: #14141E;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
    }

    .empty-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.25rem;
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #FFFFFF;
    }

    .empty-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      max-width: 400px;
      margin-bottom: 0.5rem;
    }

    /* Modal Backdrop & Card */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
    }

    .modal-card {
      width: 100%;
      max-width: 440px;
      background: #161622;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.75rem;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      animation: modalScale 0.15s ease-out;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 0.25rem;
    }

    .modal-desc {
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .input-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skeleton-row {
      height: 44px;
      border-radius: var(--radius-sm);
    }

    @keyframes modalScale {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 640px) {
      .filters-bar {
        flex-direction: column;
        align-items: flex-start;
      }
      .secondary-filters {
        width: 100%;
        justify-content: space-between;
      }
    }
  `],
})
export class TasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private projectService = inject(ProjectService);
  private toast = inject(ToastService);

  // Projects state
  projects = signal<Project[]>([]);
  selectedProjectId = signal<string>('all');

  // Tasks state
  allTasks = signal<Task[]>([]);
  taskCache = new Map<string, Task[]>(); // In-memory session cache

  // UI state
  isLoading = signal(true);
  searchQuery = signal('');
  statusFilter = signal<TaskStatus | 'all'>('all');
  priorityFilter = signal<TaskPriority | 'all'>('all');
  sortBy = signal<'recent' | 'oldest' | 'due_date' | 'priority'>('recent');

  selectedTask = signal<Task | null>(null);
  isCreatingTask = signal(false);

  showNewProjectModal = signal(false);
  newProjectName = '';
  newProjectDescription = '';
  isCreatingProject = signal(false);

  showOnboarding = signal(false);

  // Filtered tasks computed purely in memory (ZERO HTTP calls on search/filter/sort)
  readonly filteredTasks = computed(() => {
    return this.taskService.applyFilters(this.allTasks(), {
      projectId: this.selectedProjectId(),
      status: this.statusFilter(),
      priority: this.priorityFilter(),
      searchQuery: this.searchQuery(),
      sortBy: this.sortBy(),
    });
  });

  // Section groupings computed in memory
  readonly backlogTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'backlog')
  );

  readonly inProgressTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'in_progress')
  );

  readonly readyForTestTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'ready_for_test')
  );

  readonly doneTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'done')
  );

  // Summary counts
  readonly totalCount = computed(() => this.allTasks().length);
  readonly activeCount = computed(
    () => this.allTasks().filter((t) => t.status === 'backlog' || t.status === 'in_progress').length
  );
  readonly readyForTestCount = computed(
    () => this.allTasks().filter((t) => t.status === 'ready_for_test').length
  );
  readonly doneCount = computed(
    () => this.allTasks().filter((t) => t.status === 'done').length
  );

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading.set(true);
    try {
      // 1. Fetch user projects (1 GET request)
      const projectList = await this.projectService.getProjects();
      this.projects.set(projectList);

      if (projectList.length === 0) {
        this.showOnboarding.set(true);
        this.isLoading.set(false);
        return;
      }

      // Default to first project if available
      const defaultProj = projectList[0];
      this.selectedProjectId.set(defaultProj.id);

      // 2. Fetch tasks for current project (1 GET request)
      await this.loadTasksForProject(defaultProj.id);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar dados do servidor.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadTasksForProject(projectId: string, forceRefresh = false): Promise<void> {
    // Check in-memory session cache first to save requests
    if (!forceRefresh && this.taskCache.has(projectId)) {
      this.allTasks.set(this.taskCache.get(projectId)!);
      return;
    }

    try {
      const data = await this.taskService.getTasks(projectId);
      this.allTasks.set(data);
      this.taskCache.set(projectId, data);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar tarefas.');
    }
  }

  async onProjectChange(projectId: string): Promise<void> {
    this.selectedProjectId.set(projectId);
    this.isLoading.set(true);
    await this.loadTasksForProject(projectId);
    this.isLoading.set(false);
  }

  async refreshCurrentProject(force = true): Promise<void> {
    this.isLoading.set(true);
    this.taskCache.clear(); // Invalidate cache on explicit user request
    const projectList = await this.projectService.getProjects();
    this.projects.set(projectList);
    await this.loadTasksForProject(this.selectedProjectId(), force);
    this.isLoading.set(false);
    this.toast.info('Tarefas atualizadas com sucesso.');
  }

  // Client-Side Search & Filter methods (ZERO requests)
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  setStatusFilter(status: TaskStatus | 'all'): void {
    this.statusFilter.set(status);
  }

  onPriorityFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as TaskPriority | 'all';
    this.priorityFilter.set(val);
  }

  onSortByChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as any;
    this.sortBy.set(val);
  }

  // Task creation and editing (Manual save, 1 request ONLY upon save)
  openNewTaskModal(): void {
    this.selectedTask.set(null);
    this.isCreatingTask.set(true);
  }

  openTaskDetails(task: Task): void {
    this.selectedTask.set(task);
    this.isCreatingTask.set(false);
  }

  closeTaskDetails(): void {
    this.selectedTask.set(null);
    this.isCreatingTask.set(false);
  }

  async handleSaveTask(payload: any): Promise<void> {
    try {
      if (this.isCreatingTask()) {
        const created = await this.taskService.createTask(payload as CreateTaskDto);
        this.allTasks.update((list) => [created, ...list]);
        this.toast.success('Tarefa criada com sucesso!');
      } else if (this.selectedTask()) {
        const updated = await this.taskService.updateTask(
          this.selectedTask()!.id,
          payload as UpdateTaskDto
        );
        this.allTasks.update((list) =>
          list.map((t) => (t.id === updated.id ? updated : t))
        );
        this.selectedTask.set(updated);
        this.toast.success('Alterações salvas com sucesso!');
      }
      // Update cache
      this.taskCache.set(this.selectedProjectId(), this.allTasks());
      this.closeTaskDetails();
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao salvar tarefa.');
    }
  }

  async handleDeleteTask(taskId: string): Promise<void> {
    try {
      await this.taskService.deleteTask(taskId);
      this.allTasks.update((list) => list.filter((t) => t.id !== taskId));
      this.taskCache.set(this.selectedProjectId(), this.allTasks());
      this.closeTaskDetails();
      this.toast.info('Tarefa removida.');
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao remover tarefa.');
    }
  }

  // Project creation
  openNewProjectModal(): void {
    this.newProjectName = '';
    this.newProjectDescription = '';
    this.showNewProjectModal.set(true);
  }

  async handleCreateProject(): Promise<void> {
    const name = this.newProjectName.trim();
    if (!name) return;

    this.isCreatingProject.set(true);
    try {
      const created = await this.projectService.createProject({
        name,
        description: this.newProjectDescription.trim(),
      });
      this.projects.update((list) => [...list, created]);
      this.selectedProjectId.set(created.id);
      this.showNewProjectModal.set(false);
      await this.loadTasksForProject(created.id, true);
      this.toast.success(`Projeto "${created.name}" criado com sucesso!`);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao criar projeto.');
    } finally {
      this.isCreatingProject.set(false);
    }
  }

  async handleOnboardingProject(name: string): Promise<void> {
    try {
      const created = await this.projectService.createProject({ name });
      this.projects.set([created]);
      this.selectedProjectId.set(created.id);
      this.showOnboarding.set(false);
      await this.loadTasksForProject(created.id, true);
      this.toast.success(`Projeto "${created.name}" criado! Agora adicione sua primeira tarefa.`);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao criar projeto inicial.');
    }
  }

  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case 'backlog': return 'Backlog';
      case 'in_progress': return 'Em andamento';
      case 'ready_for_test': return 'Pronto para testar';
      case 'done': return 'Concluído';
    }
  }

  formatDueDate(dueAt: string): string {
    try {
      const date = new Date(dueAt);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch {
      return dueAt;
    }
  }

  isOverdue(dueAt: string): boolean {
    try {
      return new Date(dueAt).getTime() < Date.now();
    } catch {
      return false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

    // Shortcut 'N' -> Open new task modal (when not focused on input)
    if (!isEditing && event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.openNewTaskModal();
    }
  }
}

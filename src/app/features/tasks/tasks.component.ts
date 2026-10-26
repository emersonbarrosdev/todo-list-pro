import { Component, OnInit, computed, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TaskDetailsComponent } from '../../shared/components/task-details/task-details.component';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { Task, TaskStatus, TaskPriority, CreateTaskDto, UpdateTaskDto, getProjectColor } from '../../core/models/task.model';
import { Project } from '../../core/models/project.model';

import { ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TaskDetailsComponent],
  template: `
    <div class="tasks-layout">
      <!-- Shell Header (No global project selector, search + single + Nova tarefa button) -->
      <app-header
        [projects]="projects()"
        [selectedProjectId]="selectedProjectId()"
        [searchQuery]="searchQuery()"
        (projectChanged)="onProjectChange($event)"
        (searchChanged)="onSearchChange($event)"
        (newTaskClicked)="openNewTaskModal()"
      ></app-header>

      <!-- Main Workspace -->
      <main class="main-content">
        <div class="app-container">
          <!-- Top Bar: Summary and Refresh Button ONLY -->
          <div class="workspace-header">
            <div class="workspace-top-bar">
              <div class="summary-meta">
                <span class="summary-count">
                  <strong>{{ activeCount() }}</strong> {{ activeCount() === 1 ? 'ativa' : 'ativas' }}
                </span>
                <span class="summary-divider">·</span>
                <span class="summary-qa">
                  <strong>{{ qaCount() }}</strong> em QA
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
                  (click)="refreshTasks(true)"
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
                  [class.active]="statusFilter() === 'backlog'"
                  (click)="setStatusFilter('backlog')"
                >
                  Backlog
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'in_progress' || statusFilter() === 'doing'"
                  (click)="setStatusFilter('in_progress')"
                >
                  Doing
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'qa'"
                  (click)="setStatusFilter('qa')"
                >
                  QA
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'done'"
                  (click)="setStatusFilter('done')"
                >
                  Done
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'all'"
                  (click)="setStatusFilter('all')"
                >
                  Todas
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

          <!-- Tasks Panel View -->
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
                <h3 class="empty-title">Nenhuma tarefa encontrada</h3>
                <p class="empty-subtitle">Comece organizando seus projetos e demandas com uma nova tarefa.</p>
                <button
                  id="btn-empty-new-task"
                  type="button"
                  class="btn btn-primary"
                  (click)="openNewTaskModal()"
                >
                  + Criar primeira tarefa
                </button>
              </div>
            } @else {
              <!-- Clean Flat Task List with Section Header -->
              <div class="tasks-panel">
                <div class="panel-header">
                  <span class="section-dot" [ngClass]="'dot-' + (statusFilter() === 'all' ? 'all' : statusFilter())"></span>
                  <span class="section-heading">{{ getSectionHeading() }}</span>
                </div>

                <div class="task-list">
                  @for (task of filteredTasks(); track task.id) {
                    <div
                      class="task-row"
                      [class.task-done]="task.status === 'done'"
                      [class.highlight-qa]="task.status === 'qa'"
                      (click)="openTaskDetails(task)"
                    >
                      <div class="task-left">
                        <span
                          class="status-dot"
                          [ngClass]="'status-' + task.status"
                          [title]="getStatusLabel(task.status)"
                        ></span>

                        <!-- Reprovado chip if applicable -->
                        @if (task.qa_result === 'rejected') {
                          <span class="qa-flag-badge qa-flag-rejected" [title]="task.qa_notes || 'Reprovado'">✕ Reprovado</span>
                        }
                        <!-- Pendente chip if applicable -->
                        @if (task.qa_result === 'pending') {
                          <span class="qa-flag-badge qa-flag-pending" [title]="task.qa_notes || 'Pendente'">⚠ Pendente</span>
                        }

                        <span class="task-title">{{ task.title }}</span>
                      </div>

                      <div class="task-right">
                        <!-- Project Tag Colored Chip -->
                        @if (task.project) {
                          <span
                            class="project-chip"
                            [style.borderColor]="getProjectColor(task.project)"
                            [style.color]="getProjectColor(task.project)"
                            [style.background]="getProjectColor(task.project) + '15'"
                          >
                            {{ task.project }}
                          </span>
                        }

                        <!-- If on "Todas" tab, show status navigation button to jump directly and open in inspector -->
                        @if (statusFilter() === 'all') {
                          <button
                            type="button"
                            class="btn-status-nav"
                            [ngClass]="'status-nav-' + task.status"
                            (click)="jumpToStatus(task, task.status, $event)"
                            [title]="'Ver no ' + getStatusLabel(task.status) + ' e abrir detalhes'"
                          >
                            {{ getStatusLabel(task.status) }} →
                          </button>
                        } @else if (task.status === 'backlog') {
                          <!-- Quick Start Action on Backlog -->
                          <button
                            type="button"
                            class="btn-card-action btn-card-start"
                            (click)="quickStartTask(task, $event)"
                            title="Iniciar tarefa e abrir"
                          >
                            ▶ Iniciar
                          </button>
                        } @else if (task.status === 'in_progress' || task.status === 'doing') {
                          <!-- Quick Finish to QA Action on Doing -->
                          <button
                            type="button"
                            class="btn-card-action btn-card-finish"
                            (click)="quickFinishTask(task, $event)"
                            title="Finalizar e enviar para QA"
                          >
                            Finalizar → QA
                          </button>
                        } @else if (task.status === 'qa') {
                          <span class="qa-state-pill">
                            {{ task.qa_result === 'approved' ? 'Aprovado' : task.qa_result === 'rejected' ? 'Reprovado' : 'Aguardando QA' }}
                          </span>
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
              </div>
            }
          </div>
        </div>
      </main>

      <!-- Task Details & Creation Sheet -->
      @if (selectedTask() || isCreatingTask()) {
        <app-task-details
          [task]="selectedTask()"
          [isNew]="isCreatingTask()"
          (save)="handleSaveTask($event)"
          (delete)="handleDeleteTask($event)"
          (close)="closeTaskDetails()"
        ></app-task-details>
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

    .summary-qa strong {
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
      padding: 0.3rem 0.75rem;
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
      gap: 0.65rem;
    }

    .select-compact {
      width: auto;
      min-width: 165px;
      padding: 0.4rem 2.2rem 0.4rem 0.85rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
      background-color: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      white-space: nowrap;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      appearance: none;
      -webkit-appearance: none;
      transition: all var(--transition-fast);
    }

    .select-compact:hover {
      border-color: var(--text-muted);
      color: var(--text);
    }

    .select-compact:focus {
      border-color: var(--primary);
      outline: none;
    }

    /* Workflow Sections: BACKLOG, IN PROGRESS, QA, DONE */
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

    .workflow-section.section-qa {
      border-color: rgba(245, 158, 11, 0.3);
    }

    /* Tasks Panel */
    .tasks-panel {
      background: #14141E;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.75rem 1.15rem;
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

    .dot-all { background: #8B5CF6; }
    .dot-backlog { background: #94A3B8; }
    .dot-in-progress, .dot-doing { background: #3B82F6; }
    .dot-qa { background: #F59E0B; }
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
      gap: 0.65rem;
      overflow: hidden;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-backlog { background: #94A3B8; }
    .status-in_progress { background: #3B82F6; }
    .status-qa { background: #F59E0B; }
    .status-done { background: #10B981; }

    .task-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-done-check {
      color: #10B981;
      font-weight: 800;
      font-size: 0.8125rem;
    }

    .task-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* Project Chip with Colored Contour */
    .project-chip {
      font-size: 0.6875rem;
      font-weight: 700;
      border-width: 1.5px;
      border-style: solid;
      border-radius: 9999px;
      padding: 0.15rem 0.55rem;
      letter-spacing: 0.02em;
    }

    /* Reprovado / Pendente Badges */
    .qa-flag-badge {
      font-size: 0.6875rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .qa-flag-rejected {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid #EF4444;
      color: #F87171;
    }

    .qa-flag-pending {
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid #F59E0B;
      color: #FBBF24;
    }

    .qa-state-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.18);
      color: #FCD34D;
      border: 1px solid rgba(245, 158, 11, 0.35);
      flex-shrink: 0;
    }

    /* Card Action Buttons */
    .btn-card-action {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.55rem;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-card-start {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3B82F6;
      color: #93C5FD;
    }

    .btn-card-start:hover {
      background: #3B82F6;
      color: #FFFFFF;
    }

    .btn-card-finish {
      background: rgba(245, 158, 11, 0.2);
      border-color: #F59E0B;
      color: #FCD34D;
    }

    .btn-card-finish:hover {
      background: #F59E0B;
      color: #000000;
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

    /* Status Navigation Button (in "Todas" view) */
    .btn-status-nav {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .status-nav-backlog {
      background: rgba(148, 163, 184, 0.15);
      border-color: rgba(148, 163, 184, 0.35);
      color: #CBD5E1;
    }
    .status-nav-backlog:hover {
      background: rgba(148, 163, 184, 0.3);
      color: #FFFFFF;
    }

    .status-nav-in_progress, .status-nav-doing {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.35);
      color: #93C5FD;
    }
    .status-nav-in_progress:hover, .status-nav-doing:hover {
      background: rgba(59, 130, 246, 0.3);
      color: #FFFFFF;
    }

    .status-nav-qa {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.35);
      color: #FCD34D;
    }
    .status-nav-qa:hover {
      background: rgba(245, 158, 11, 0.3);
      color: #FFFFFF;
    }

    .status-nav-done {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.35);
      color: #6EE7B7;
    }
    .status-nav-done:hover {
      background: rgba(16, 185, 129, 0.3);
      color: #FFFFFF;
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

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .skeleton-row {
      height: 44px;
      border-radius: var(--radius-sm);
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

  getProjectColor = getProjectColor;

  // Projects state
  projects = signal<Project[]>([]);
  selectedProjectId = signal<string>('all');

  // Tasks state
  allTasks = signal<Task[]>([]);
  taskCache = new Map<string, Task[]>(); // In-memory session cache

  // UI state
  isLoading = signal(true);
  searchQuery = signal('');
  statusFilter = signal<TaskStatus | 'all'>('backlog');
  priorityFilter = signal<TaskPriority | 'all'>('all');
  sortBy = signal<'recent' | 'oldest' | 'due_date' | 'priority'>('recent');

  selectedTask = signal<Task | null>(null);
  isCreatingTask = signal(false);

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
    this.filteredTasks().filter((t) => t.status === 'in_progress' || (t.status as any) === 'doing')
  );

  readonly qaTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'qa')
  );

  readonly doneTasks = computed(() =>
    this.filteredTasks().filter((t) => t.status === 'done')
  );

  // Summary counts
  readonly totalCount = computed(() => this.allTasks().length);
  readonly activeCount = computed(
    () => this.allTasks().filter((t) => t.status === 'backlog' || t.status === 'in_progress' || (t.status as any) === 'doing').length
  );
  readonly qaCount = computed(
    () => this.allTasks().filter((t) => t.status === 'qa').length
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
      const projectList = await this.projectService.getProjects().catch(() => []);
      if (projectList && projectList.length > 0) {
        this.projects.set(projectList);
      } else {
        this.projects.set([
          {
            id: 'proj_default',
            user_id: 'default',
            name: 'Geral',
            archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      // Direct load of all tasks for the authenticated user (1 GET request)
      const data = await this.taskService.getTasks();
      this.allTasks.set(data);
      this.taskCache.set('all', data);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar tarefas do servidor.');
    } finally {
      this.isLoading.set(false);
    }
  }

  onProjectChange(projectId: string): void {
    this.selectedProjectId.set(projectId);
  }

  async refreshTasks(force = true): Promise<void> {
    this.isLoading.set(true);
    this.taskCache.clear();
    try {
      const data = await this.taskService.getTasks();
      this.allTasks.set(data);
      this.taskCache.set('all', data);
      this.toast.info('Tarefas atualizadas.');
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao atualizar tarefas.');
    } finally {
      this.isLoading.set(false);
    }
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

  // Quick Action: Iniciar on Backlog card (moves to in_progress, resets qa_result, saves, and opens inspector)
  async quickStartTask(task: Task, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      const updated = await this.taskService.updateTask(task.id, {
        status: 'in_progress',
        qa_result: 'not_started',
      });
      this.allTasks.update((list) =>
        list.map((t) => (t.id === updated.id ? updated : t))
      );
      this.taskCache.set('all', this.allTasks());
      this.toast.success(`Tarefa iniciada: ${task.title}`);
      this.openTaskDetails(updated);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao iniciar tarefa.');
    }
  }

  jumpToStatus(task: Task, status: TaskStatus, event: MouseEvent): void {
    event.stopPropagation();
    const targetStatus = (status as any) === 'doing' ? 'in_progress' : status;
    this.setStatusFilter(targetStatus);
    this.openTaskDetails(task);
  }

  getSectionHeading(): string {
    switch (this.statusFilter()) {
      case 'backlog': return 'BACKLOG';
      case 'in_progress':
      case 'doing': return 'DOING';
      case 'qa': return 'QA';
      case 'done': return 'DONE';
      case 'all': return 'TODAS AS TAREFAS';
      default: return 'TAREFAS';
    }
  }

  // Quick Action: Finalizar on In Progress card (moves to qa with qa_result: not_started)
  async quickFinishTask(task: Task, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      const updated = await this.taskService.updateTask(task.id, {
        status: 'qa',
        qa_result: 'not_started',
      });
      this.allTasks.update((list) =>
        list.map((t) => (t.id === updated.id ? updated : t))
      );
      this.taskCache.set('all', this.allTasks());
      this.toast.success(`Tarefa enviada para QA: ${task.title}`);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao finalizar tarefa.');
    }
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
      this.taskCache.set('all', this.allTasks());
      this.closeTaskDetails();
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao salvar tarefa.');
    }
  }

  async handleDeleteTask(taskId: string): Promise<void> {
    try {
      await this.taskService.deleteTask(taskId);
      this.allTasks.update((list) => list.filter((t) => t.id !== taskId));
      this.taskCache.set('all', this.allTasks());
      this.closeTaskDetails();
      this.toast.info('Tarefa removida.');
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao remover tarefa.');
    }
  }

  getStatusLabel(status: TaskStatus): string {
    switch (status) {
      case 'backlog': return 'Backlog';
      case 'in_progress':
      case 'doing': return 'Doing';
      case 'qa': return 'QA';
      case 'done': return 'Done';
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

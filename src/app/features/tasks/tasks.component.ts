import { Component, OnInit, computed, inject, signal, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { OnboardingComponent } from '../../shared/components/onboarding/onboarding.component';
import { TaskDetailsComponent } from '../../shared/components/task-details/task-details.component';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { Task, WorkMode, TaskStatus, TaskPriority, CreateTaskDto, UpdateTaskDto } from '../../core/models/task.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HeaderComponent, OnboardingComponent, TaskDetailsComponent],
  template: `
    <div class="tasks-layout">
      <!-- Shell Header -->
      <app-header
        [searchQuery]="searchQuery()"
        [workMode]="currentWorkMode()"
        (searchQueryChange)="onSearchChange($event)"
        (newTaskClicked)="openNewTaskModal()"
        (modeToggle)="cycleWorkMode()"
      ></app-header>

      <!-- Main Workspace -->
      <main class="main-content">
        <div class="app-container">
          <!-- Top Bar: Summary, Refresh, and New Task Trigger -->
          <div class="workspace-header">
            <div class="workspace-top-bar">
              <div class="summary-meta">
                <span class="summary-count">
                  <strong>{{ activeCount() }}</strong> {{ activeCount() === 1 ? 'tarefa ativa' : 'tarefas ativas' }}
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
                  (click)="loadTasks()"
                  [disabled]="isLoading()"
                  title="Atualizar lista de tarefas do servidor"
                >
                  <svg [class.spin]="isLoading()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span>Atualizar</span>
                </button>

                <!-- New Task Trigger Button -->
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  (click)="openNewTaskModal()"
                  title="Criar nova tarefa localmente (N)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Nova tarefa</span>
                </button>
              </div>
            </div>

            <!-- Compact Filter & Sorting Bar (100% Client-Side In-Memory) -->
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
                  [class.active]="statusFilter() === 'todo'"
                  (click)="setStatusFilter('todo')"
                >
                  A fazer
                </button>
                <button
                  type="button"
                  class="filter-pill"
                  [class.active]="statusFilter() === 'doing'"
                  (click)="setStatusFilter('doing')"
                >
                  Em andamento
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

              <!-- Compact Secondary Filters & Sorting Controls -->
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

                <!-- Work Mode Filter Dropdown -->
                <select
                  class="select select-compact"
                  [value]="modeFilter()"
                  (change)="onModeFilterChange($event)"
                  aria-label="Filtrar por modo"
                >
                  <option value="all">Modo: Todos</option>
                  <option value="general">Geral</option>
                  <option value="dev">DEV</option>
                  <option value="qa">QA</option>
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
                  <option value="due_date">Prazo mais próximo</option>
                  <option value="priority">Prioridade</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Tasks List Section -->
          <div class="tasks-container">
            @if (isLoading()) {
              <!-- Loading Skeletons -->
              <div class="skeleton-list" aria-busy="true" aria-label="Carregando tarefas">
                <div class="skeleton-row">
                  <div class="skeleton-check skeleton"></div>
                  <div class="skeleton-body">
                    <div class="skeleton-title skeleton"></div>
                    <div class="skeleton-tags skeleton"></div>
                  </div>
                </div>
                <div class="skeleton-row">
                  <div class="skeleton-check skeleton"></div>
                  <div class="skeleton-body">
                    <div class="skeleton-title skeleton"></div>
                    <div class="skeleton-tags skeleton"></div>
                  </div>
                </div>
                <div class="skeleton-row">
                  <div class="skeleton-check skeleton"></div>
                  <div class="skeleton-body">
                    <div class="skeleton-title skeleton"></div>
                    <div class="skeleton-tags skeleton"></div>
                  </div>
                </div>
              </div>
            } @else if (filteredTasks().length === 0) {
              <!-- Empty State -->
              <div class="empty-state">
                <div class="empty-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 class="empty-title">
                  {{ searchQuery() ? 'Nenhuma tarefa encontrada' : 'Tudo organizado!' }}
                </h3>
                <p class="empty-desc">
                  {{ searchQuery() ? 'Nenhum resultado para "' + searchQuery() + '".' : 'Crie sua primeira tarefa usando o botão acima ou pressionando N.' }}
                </p>
                <div class="empty-shortcuts">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="openNewTaskModal()">
                    + Criar primeira tarefa
                  </button>
                  <span class="shortcut-chip"><kbd>Ctrl K</kbd> Buscar</span>
                  <span class="shortcut-chip"><kbd>Esc</kbd> Fechar painel</span>
                </div>
              </div>
            } @else {
              <!-- Dense Task Items List -->
              <ul class="task-list" role="list">
                @for (task of filteredTasks(); track task.id) {
                  <li
                    class="task-row"
                    [class.completed]="task.status === 'done'"
                    (click)="selectTask(task)"
                    (keydown.enter)="selectTask(task)"
                    (keydown.space)="$event.preventDefault(); selectTask(task)"
                    role="button"
                    tabindex="0"
                    [attr.aria-label]="'Abrir detalhes de: ' + task.title"
                  >
                    <!-- Status Indicator Icon -->
                    <div class="status-dot-wrapper">
                      @if (task.status === 'done') {
                        <span class="status-indicator-icon done">✓</span>
                      } @else if (task.status === 'doing') {
                        <span class="status-indicator-icon doing">●</span>
                      } @else {
                        <span class="status-indicator-icon todo">○</span>
                      }
                    </div>

                    <!-- Content -->
                    <div class="task-info">
                      <span class="task-title">{{ task.title }}</span>

                      <!-- Badges metadata -->
                      <div class="task-badges">
                        @if (task.work_mode === 'dev' && task.metadata.type) {
                          <span class="badge badge-dev">DEV · {{ task.metadata.type }}</span>
                        }
                        @if (task.work_mode === 'qa' && task.metadata.type) {
                          <span class="badge badge-qa">QA · {{ task.metadata.type }}</span>
                        }
                        @if (task.priority !== 'normal') {
                          <span class="badge" [ngClass]="'badge-' + task.priority">
                            {{ task.priority === 'high' ? 'Alta' : 'Baixa' }}
                          </span>
                        }
                        @if (task.due_at) {
                          <span class="badge badge-date" [class.overdue]="isOverdue(task.due_at, task.status)">
                            📅 {{ formatDate(task.due_at) }}
                          </span>
                        }
                        @for (tag of (task.tags || []).slice(0, 3); track tag) {
                          <span class="badge">#{{ tag }}</span>
                        }
                      </div>
                    </div>

                    <!-- Row Actions -->
                    <div class="task-actions" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="btn-delete"
                        [title]="'Remover ' + task.title"
                        (click)="handleDeleteTask(task)"
                        [attr.aria-label]="'Remover ' + task.title"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      </main>

      <!-- First login Onboarding modal -->
      @if (showOnboarding()) {
        <app-onboarding (completed)="handleOnboardingComplete($event)"></app-onboarding>
      }

      <!-- Lateral Details Sheet for Editing Existing or New Task -->
      @if (selectedTask(); as currentSelected) {
        <app-task-details
          [task]="currentSelected"
          [isNew]="isNewTask()"
          (taskSaved)="handleTaskSaved($event)"
          (close)="closeDetails()"
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
      padding: 1.75rem 0 3rem;
    }

    .workspace-header {
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .workspace-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .summary-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .summary-count strong {
      color: var(--text);
    }

    .summary-divider {
      color: var(--text-muted);
    }

    .summary-done {
      color: var(--text-muted);
    }

    .top-bar-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-refresh:hover:not(:disabled) {
      color: var(--text);
      background: var(--surface-hover);
      border-color: var(--text-muted);
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .spin {
      animation: spin 0.8s linear infinite;
    }

    .filters-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.25rem 0;
    }

    .status-pills {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.25rem;
    }

    .filter-pill {
      padding: 0.35rem 0.65rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: var(--radius-xs);
      transition: all var(--transition-fast);
      background: transparent;
      border: none;
      cursor: pointer;
    }

    .filter-pill:hover {
      color: var(--text);
    }

    .filter-pill.active {
      background: var(--surface-hover);
      color: var(--text);
      font-weight: 600;
      box-shadow: var(--shadow-sm);
    }

    .secondary-filters {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .select-compact {
      width: auto;
      padding: 0.35rem 0.65rem;
      font-size: 0.8125rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      color: var(--text-secondary);
      cursor: pointer;
    }

    .select-compact:focus {
      border-color: var(--border-focus);
      color: var(--text);
    }

    .tasks-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 0.5rem;
      box-shadow: var(--shadow-md);
    }

    .task-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0;
      padding: 0;
    }

    .task-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 0.85rem;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
      cursor: pointer;
    }

    .task-row:hover {
      background: var(--surface-hover);
    }

    .status-dot-wrapper {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .status-indicator-icon.done {
      color: #4ADE80;
      font-weight: 700;
    }

    .status-indicator-icon.doing {
      color: #60A5FA;
      font-size: 0.75rem;
    }

    .status-indicator-icon.todo {
      color: var(--text-muted);
    }

    .task-row.completed .task-title {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .task-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .task-title {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .badge-date.overdue {
      color: var(--danger);
      background: var(--danger-soft);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .task-actions {
      display: flex;
      align-items: center;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .task-row:hover .task-actions {
      opacity: 1;
    }

    .btn-delete {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      transition: all var(--transition-fast);
      background: transparent;
      border: none;
      cursor: pointer;
    }

    .btn-delete:hover {
      background: var(--danger-soft);
      color: var(--danger);
    }

    .task-row:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: -2px;
    }

    .empty-state {
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      border-radius: 50%;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      box-shadow: 0 0 16px rgba(139, 92, 246, 0.15);
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      color: var(--text);
    }

    .empty-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      max-width: 380px;
      margin: 0 auto 1.25rem;
      line-height: 1.5;
    }

    .empty-shortcuts {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .shortcut-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-xs);
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .shortcut-chip kbd {
      padding: 0.1rem 0.35rem;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 3px;
      font-size: 0.6875rem;
      color: var(--text);
      font-family: inherit;
    }

    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .skeleton-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 0.85rem;
      border-radius: var(--radius-sm);
    }

    .skeleton-check {
      width: 18px;
      height: 18px;
      border-radius: var(--radius-xs);
      flex-shrink: 0;
    }

    .skeleton-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .skeleton-title {
      height: 14px;
      width: 45%;
      border-radius: var(--radius-xs);
    }

    .skeleton-tags {
      height: 10px;
      width: 25%;
      border-radius: var(--radius-xs);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class TasksComponent implements OnInit {
  @ViewChild(HeaderComponent) headerComp?: HeaderComponent;

  private taskService = inject(TaskService);
  private auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);

  tasks = signal<Task[]>([]);
  isLoading = signal<boolean>(true);
  showOnboarding = signal<boolean>(false);
  currentWorkMode = signal<WorkMode>('general');
  searchQuery = signal<string>('');

  statusFilter = signal<TaskStatus | 'all'>('all');
  priorityFilter = signal<TaskPriority | 'all'>('all');
  modeFilter = signal<WorkMode | 'all'>('all');
  sortBy = signal<'recent' | 'oldest' | 'due_date' | 'priority'>('recent');

  selectedTask = signal<Task | null>(null);
  isNewTask = signal<boolean>(false);

  // Pure client-side computed filtering & sorting over in-memory tasks
  filteredTasks = computed(() => {
    return this.taskService.applyFilters(this.tasks(), {
      status: this.statusFilter(),
      priority: this.priorityFilter(),
      workMode: this.modeFilter(),
      searchQuery: this.searchQuery(),
      sortBy: this.sortBy(),
    });
  });

  totalCount = computed(() => this.tasks().length);
  activeCount = computed(() => this.tasks().filter((t) => t.status !== 'done').length);
  doneCount = computed(() => this.tasks().filter((t) => t.status === 'done').length);

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    // Ctrl+K or Cmd+K: Focus search
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.headerComp?.focusSearch();
      return;
    }

    // N: New task (only if not typing in form)
    if (!isTyping && (event.key === 'n' || event.key === 'N') && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.openNewTaskModal();
      return;
    }
  }

  async ngOnInit() {
    // 1 single initial profile check + 1 single initial tasks load
    await this.checkUserProfile();
    await this.loadTasks();
  }

  async checkUserProfile() {
    try {
      const profile = await this.profileService.getProfile();
      const user = this.auth.currentUser();
      const onboardingDone = user ? localStorage.getItem(`onboarding_done_${user.id}`) : 'true';
      if (!onboardingDone && (!profile || !profile.work_mode)) {
        this.showOnboarding.set(true);
      } else if (profile?.work_mode) {
        this.currentWorkMode.set(profile.work_mode);
      }
    } catch {
      // Local fallback
    }
  }

  async handleOnboardingComplete(mode: WorkMode) {
    this.currentWorkMode.set(mode);
    this.showOnboarding.set(false);
    const user = this.auth.currentUser();
    if (user) {
      localStorage.setItem(`onboarding_done_${user.id}`, 'true');
    }
    try {
      await this.profileService.setWorkMode(mode);
      this.toast.success(`Modo ${mode.toUpperCase()} ativado com sucesso!`);
    } catch {
      // ignore
    }
  }

  async cycleWorkMode() {
    const modes: WorkMode[] = ['general', 'dev', 'qa'];
    const nextIdx = (modes.indexOf(this.currentWorkMode()) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    this.currentWorkMode.set(nextMode);
    try {
      await this.profileService.setWorkMode(nextMode);
    } catch {
      // ignore
    }
    this.toast.info(`Alternado para o modo ${nextMode.toUpperCase()}`);
  }

  /**
   * Loads tasks from the D1 server.
   * Called only on initial startup or when user clicks 'Atualizar'.
   */
  async loadTasks() {
    this.isLoading.set(true);
    try {
      const data = await this.taskService.getTasks();
      this.tasks.set(data);
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao carregar tarefas.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Pure in-memory signal updates without server re-fetching
  setStatusFilter(status: TaskStatus | 'all') {
    this.statusFilter.set(status);
  }

  onPriorityFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.priorityFilter.set(select.value as TaskPriority | 'all');
  }

  onModeFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.modeFilter.set(select.value as WorkMode | 'all');
  }

  onSortByChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortBy.set(select.value as any);
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }

  /**
   * Opens local empty form for a new task.
   * Zero network calls, zero writes to D1 until user explicitly saves.
   */
  openNewTaskModal() {
    const blankTask: Task = {
      id: '',
      user_id: this.auth.currentUser()?.id || 'guest',
      title: '',
      description: '',
      status: 'todo',
      priority: 'normal',
      due_at: null,
      tags: [],
      checklist: [],
      work_mode: this.currentWorkMode(),
      metadata: {},
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.isNewTask.set(true);
    this.selectedTask.set(blankTask);
  }

  selectTask(task: Task) {
    this.isNewTask.set(false);
    this.selectedTask.set(task);
  }

  closeDetails() {
    this.selectedTask.set(null);
    this.isNewTask.set(false);
  }

  /**
   * Handles explicit save from TaskDetailsComponent.
   * If new task: executes POST /api/tasks once.
   * If existing task: executes PUT /api/tasks/:id once.
   */
  async handleTaskSaved(payload: UpdateTaskDto | CreateTaskDto) {
    if (this.isNewTask()) {
      try {
        const created = await this.taskService.createTask(payload as CreateTaskDto);
        this.tasks.update((curr) => [created, ...curr]);
        this.selectedTask.set(null);
        this.isNewTask.set(false);
        this.toast.success('Tarefa criada com sucesso!');
      } catch (err: any) {
        this.toast.error(err.message || 'Erro ao criar tarefa.');
        throw err;
      }
    } else {
      const current = this.selectedTask();
      if (!current?.id) return;
      try {
        const updated = await this.taskService.updateTask(current.id, payload as UpdateTaskDto);
        this.tasks.update((curr) => curr.map((t) => (t.id === updated.id ? updated : t)));
        this.selectedTask.set(updated);
        this.toast.success('Alterações salvas no servidor.');
      } catch (err: any) {
        this.toast.error(err.message || 'Erro ao salvar alterações.');
        throw err;
      }
    }
  }

  /**
   * Deletes task upon explicit user confirmation.
   * Executes exactly 1 DELETE request.
   */
  async handleDeleteTask(task: Task) {
    if (!confirm(`Tem certeza que deseja excluir "${task.title}" permanentemente?`)) {
      return;
    }

    if (this.selectedTask()?.id === task.id) {
      this.closeDetails();
    }

    try {
      await this.taskService.deleteTask(task.id);
      this.tasks.update((curr) => curr.filter((t) => t.id !== task.id));
      this.toast.success('Tarefa removida com sucesso.');
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao excluir tarefa.');
    }
  }

  isOverdue(dueAt: string | null, status: TaskStatus): boolean {
    if (!dueAt || status === 'done') return false;
    return new Date(dueAt).getTime() < Date.now();
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}

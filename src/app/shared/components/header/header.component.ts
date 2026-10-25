import { Component, EventEmitter, Input, Output, signal, inject, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header">
      <div class="header-container">
        <!-- Logo & Project Selector Group -->
        <div class="brand-group">
          <a routerLink="/" class="logo" aria-label="TODO PRO Início">
            <div class="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span class="logo-text">TODO <span class="logo-highlight">PRO</span></span>
          </a>

          <!-- Project Selector Dropdown -->
          <div class="project-selector-wrapper">
            <button
              id="header-project-selector"
              class="project-selector-btn"
              [class.open]="showProjectMenu()"
              (click)="toggleProjectMenu($event)"
              type="button"
              aria-label="Selecionar projeto"
            >
              <svg class="project-folder-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="project-label">{{ currentProjectName() }}</span>
              <svg class="chevron-icon" [class.rotated]="showProjectMenu()" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            @if (showProjectMenu()) {
              <div class="dropdown-menu project-menu" (click)="$event.stopPropagation()">
                <div class="dropdown-header">Projetos</div>
                <div class="project-list-scroll">
                  @for (project of projects; track project.id) {
                    <button
                      class="dropdown-item"
                      [class.active]="selectedProjectId === project.id"
                      (click)="onSelectProject(project.id)"
                      type="button"
                    >
                      <span class="project-bullet"></span>
                      <span class="project-item-name">{{ project.name }}</span>
                    </button>
                  }
                </div>

                <div class="dropdown-divider"></div>

                <button
                  class="dropdown-item"
                  [class.active]="selectedProjectId === 'all'"
                  (click)="onSelectProject('all')"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Todos os projetos</span>
                </button>

                <div class="dropdown-divider"></div>

                <button
                  class="dropdown-item new-project-action"
                  (click)="onNewProject()"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>+ Novo projeto</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Search Bar (Desktop) -->
        <div class="search-box" [class.mobile-open]="showMobileSearch()">
          <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            #searchInput
            id="header-search-input"
            type="text"
            class="search-input"
            placeholder="Buscar tarefas... (Ctrl+K)"
            [value]="searchQuery"
            (input)="onSearchInput($event)"
            aria-label="Buscar tarefas"
          />
          <kbd class="kbd">Ctrl K</kbd>
        </div>

        <!-- Header Actions: Single "+ Nova tarefa" button & User Identity chip -->
        <div class="header-actions">
          <!-- Mobile search trigger -->
          <button
            class="btn btn-ghost btn-icon btn-mobile-search"
            (click)="toggleMobileSearch()"
            type="button"
            aria-label="Buscar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>

          <!-- The ONLY primary task creation button -->
          <button
            id="btn-header-new-task"
            class="btn btn-primary btn-sm"
            (click)="newTaskClicked.emit()"
            type="button"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span class="btn-text">+ Nova tarefa</span>
          </button>

          <!-- User Identity Chip (replaces Geral and separate gear icon) -->
          <div class="user-chip-wrapper">
            <button
              id="header-user-chip"
              class="user-chip"
              [class.open]="showUserMenu()"
              (click)="toggleUserMenu($event)"
              type="button"
              aria-label="Menu do usuário"
            >
              <span class="avatar-badge">{{ userInitials() }}</span>
              <span class="user-chip-name">{{ userShortName() }}</span>
              <svg class="chevron-icon" [class.rotated]="showUserMenu()" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            @if (showUserMenu()) {
              <div class="dropdown-menu user-menu" (click)="$event.stopPropagation()">
                <div class="user-menu-profile">
                  <div class="profile-avatar">{{ userInitials() }}</div>
                  <div class="profile-info">
                    <span class="profile-name">{{ userFullName() }}</span>
                    <span class="profile-email">{{ userEmail() }}</span>
                  </div>
                </div>

                <div class="dropdown-divider"></div>

                <button class="dropdown-item" (click)="onOpenSettings()" type="button">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Configurações</span>
                </button>

                <button class="dropdown-item text-danger" (click)="onSignOut()" type="button">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sair</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 15, 23, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      height: 60px;
    }

    .header-container {
      max-width: 1280px;
      margin: 0 auto;
      height: 100%;
      padding: 0 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      text-decoration: none;
      flex-shrink: 0;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.35);
    }

    .logo-text {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }

    .logo-highlight {
      color: var(--primary);
    }

    /* Project Selector Dropdown */
    .project-selector-wrapper {
      position: relative;
    }

    .project-selector-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      max-width: 220px;
    }

    .project-selector-btn:hover,
    .project-selector-btn.open {
      background: var(--surface-hover);
      border-color: var(--primary-border, rgba(139, 92, 246, 0.4));
    }

    .project-folder-icon {
      color: var(--primary);
      flex-shrink: 0;
    }

    .project-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chevron-icon {
      color: var(--text-muted);
      transition: transform var(--transition-fast);
      flex-shrink: 0;
    }

    .chevron-icon.rotated {
      transform: rotate(180deg);
    }

    /* Search Box */
    .search-box {
      flex: 1;
      max-width: 380px;
      position: relative;
      display: flex;
      align-items: center;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0 0.65rem;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .search-box:focus-within {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--primary-soft);
    }

    .search-icon {
      color: var(--text-muted);
      margin-right: 0.5rem;
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text);
      outline: none;
      font-size: 0.8125rem;
      padding: 0.45rem 0;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .kbd {
      font-family: inherit;
      font-size: 0.6875rem;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    /* Header Actions */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .btn-mobile-search {
      display: none;
    }

    /* User Identity Chip */
    .user-chip-wrapper {
      position: relative;
    }

    .user-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.65rem 0.25rem 0.25rem;
      border-radius: 9999px;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      color: var(--text);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .user-chip:hover,
    .user-chip.open {
      background: var(--surface-hover);
      border-color: rgba(139, 92, 246, 0.4);
    }

    .avatar-badge {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      color: #C4B5FD;
      font-size: 0.6875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      letter-spacing: -0.02em;
    }

    .user-chip-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Common Dropdown Menu */
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 200px;
      background: #181825;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
      z-index: 100;
      padding: 0.35rem;
      animation: fadeIn 0.12s ease-out;
    }

    .project-menu {
      left: 0;
      right: auto;
      min-width: 230px;
    }

    .project-list-scroll {
      max-height: 220px;
      overflow-y: auto;
    }

    .dropdown-header {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      padding: 0.4rem 0.75rem 0.25rem;
    }

    .dropdown-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem 0.75rem;
      border: none;
      background: transparent;
      color: var(--text);
      font-size: 0.8125rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      text-align: left;
      transition: background var(--transition-fast);
    }

    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .dropdown-item.active {
      background: rgba(139, 92, 246, 0.15);
      color: #C4B5FD;
      font-weight: 600;
    }

    .project-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
      flex-shrink: 0;
    }

    .project-item-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .new-project-action {
      color: var(--primary);
      font-weight: 600;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border);
      margin: 0.35rem 0;
    }

    /* User Menu Dropdown */
    .user-menu {
      min-width: 230px;
    }

    .user-menu-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
    }

    .profile-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.25);
      border: 1px solid rgba(139, 92, 246, 0.5);
      color: #DDD6FE;
      font-size: 0.8125rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .profile-info {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .profile-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #FFFFFF;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .profile-email {
      font-size: 0.75rem;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .text-danger {
      color: #F87171;
    }

    .text-danger:hover {
      background: rgba(239, 68, 68, 0.12);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .project-selector-btn {
        max-width: 140px;
      }
      .user-chip-name {
        display: none;
      }
      .user-chip {
        padding: 0.2rem;
      }
    }

    @media (max-width: 640px) {
      .header-container {
        padding: 0 0.75rem;
      }
      .logo-text {
        display: none;
      }
      .btn-mobile-search {
        display: inline-flex;
      }
      .search-box {
        display: none;
      }
      .search-box.mobile-open {
        display: flex;
        position: absolute;
        left: 10px;
        right: 10px;
        top: 65px;
        max-width: none;
        z-index: 100;
        background: #181825;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
      }
      .btn-text {
        display: none;
      }
    }
  `],
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  @Input() projects: Project[] = [];
  @Input() selectedProjectId: string = 'all';
  @Input() searchQuery: string = '';

  @Output() projectChanged = new EventEmitter<string>();
  @Output() newProjectClicked = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() newTaskClicked = new EventEmitter<void>();

  showMobileSearch = signal(false);
  showProjectMenu = signal(false);
  showUserMenu = signal(false);

  // Authenticated user computed signals
  readonly currentUser = computed(() => this.auth.currentUser());

  readonly userFullName = computed(() => {
    const user = this.currentUser();
    const raw = (user?.name || '').trim();
    if (raw && !raw.includes('@')) {
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    if (user?.email) {
      const handle = user.email.split('@')[0];
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
    return 'Usuário';
  });

  readonly userShortName = computed(() => {
    const user = this.currentUser();
    const raw = (user?.name || '').trim();
    if (raw && !raw.includes('@')) {
      const first = raw.split(/\s+/)[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
    if (user?.email) {
      const handle = user.email.split('@')[0];
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
    return 'Usuário';
  });

  readonly userEmail = computed(() => this.currentUser()?.email || '');

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    const name = user?.name?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.split('@')[0].slice(0, 2).toUpperCase();
    }
    return 'TP';
  });

  readonly currentProjectName = computed(() => {
    if (this.selectedProjectId === 'all') {
      return 'Todos os projetos';
    }
    const match = this.projects.find((p) => p.id === this.selectedProjectId);
    return match ? match.name : 'Selecionar projeto';
  });

  @HostListener('document:click')
  onDocumentClick(): void {
    // Zero API requests when closing dropdowns
    this.showProjectMenu.set(false);
    this.showUserMenu.set(false);
  }

  toggleProjectMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showUserMenu.set(false);
    this.showProjectMenu.update((v) => !v);
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showProjectMenu.set(false);
    this.showUserMenu.update((v) => !v);
  }

  toggleMobileSearch(): void {
    this.showMobileSearch.update((v) => !v);
  }

  onSelectProject(projectId: string): void {
    this.showProjectMenu.set(false);
    this.projectChanged.emit(projectId);
  }

  onNewProject(): void {
    this.showProjectMenu.set(false);
    this.newProjectClicked.emit();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChanged.emit(value);
  }

  onOpenSettings(): void {
    this.showUserMenu.set(false);
    this.router.navigate(['/settings']);
  }

  async onSignOut(): Promise<void> {
    this.showUserMenu.set(false);
    await this.auth.signOut();
    this.router.navigate(['/auth/login']);
  }
}

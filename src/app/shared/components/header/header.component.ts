import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkMode } from '../../../core/models/profile.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header">
      <div class="header-container">
        <!-- Logo -->
        <a routerLink="/" class="logo" aria-label="TODO PRO Início">
          <div class="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="logo-text">TODO <span class="logo-highlight">PRO</span></span>
        </a>

        <!-- Search Bar -->
        <div class="search-box" (click)="searchClicked.emit()">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            #searchInput
            type="text"
            class="search-input"
            [placeholder]="'Buscar tarefas... (Ctrl+K)'"
            [value]="searchQuery"
            (input)="onSearchInput($event)"
            aria-label="Buscar tarefas"
          />
          <kbd class="kbd">Ctrl K</kbd>
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Work Mode Pill -->
          <button
            class="mode-pill"
            [ngClass]="'mode-' + workMode"
            [title]="'Modo atual: ' + workModeLabel"
            (click)="modeToggle.emit()"
            type="button"
          >
            <span class="mode-dot"></span>
            <span class="mode-text">{{ workModeLabel }}</span>
          </button>

          <!-- New Task Button -->
          <button
            id="btn-new-task"
            class="btn btn-primary btn-sm"
            (click)="newTaskClicked.emit()"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Nova tarefa</span>
          </button>

          <!-- User Menu / Settings -->
          <a routerLink="/settings" class="btn btn-ghost btn-icon" title="Configurações do perfil" aria-label="Configurações">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </a>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(18, 18, 28, 0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      height: 60px;
    }

    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      height: 100%;
      padding: 0 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.65rem;
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
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
    }

    .logo-highlight {
      color: var(--primary);
    }

    .search-box {
      flex: 1;
      max-width: 440px;
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
      font-size: 0.875rem;
      padding: 0.45rem 0;
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .mode-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .mode-pill:hover {
      background: var(--surface-hover);
      border-color: var(--text-muted);
    }

    .mode-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .mode-dev .mode-dot {
      background: #60A5FA;
    }
    .mode-qa .mode-dot {
      background: #F472B6;
    }
    .mode-general .mode-dot {
      background: #A78BFA;
    }

    @media (max-width: 640px) {
      .search-box {
        display: none;
      }
      .mode-text {
        display: none;
      }
      .mode-pill {
        padding: 0.35rem;
      }
    }
  `]
})
export class HeaderComponent {
  @Input() searchQuery: string = '';
  @Input() workMode: WorkMode = 'general';
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchClicked = new EventEmitter<void>();
  @Output() newTaskClicked = new EventEmitter<void>();
  @Output() modeToggle = new EventEmitter<void>();

  get workModeLabel(): string {
    switch (this.workMode) {
      case 'dev': return 'DEV';
      case 'qa': return 'QA';
      default: return 'Geral';
    }
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQueryChange.emit(input.value);
  }
}

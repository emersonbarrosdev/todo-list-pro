import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="settings-layout">
      <header class="settings-header">
        <a routerLink="/" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Voltar para tarefas</span>
        </a>
        <div class="logo-mini">
          <span>TODO <strong class="highlight">PRO</strong></span>
        </div>
      </header>

      <main class="settings-content">
        <div class="settings-card">
          <h1 class="page-title">Configurações da Conta</h1>
          <p class="page-subtitle">Gerencie suas preferências de uso, projetos arquivados e sessão no TODO PRO.</p>

          <!-- Email Section -->
          <section class="settings-section">
            <label class="section-label">E-mail conectado</label>
            <div class="email-display">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span class="user-email">{{ userEmail() }}</span>
            </div>
          </section>

          <!-- Display Name Section -->
          <section class="settings-section">
            <label for="settings-display-name" class="section-label">Nome de exibição</label>
            <div class="name-edit-group">
              <input
                id="settings-display-name"
                type="text"
                class="input"
                [(ngModel)]="displayName"
                placeholder="Seu nome..."
              />
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="saveDisplayName()"
                [disabled]="isSavingName()"
              >
                {{ isSavingName() ? 'Salvando...' : 'Salvar nome' }}
              </button>
            </div>
          </section>

          <!-- Archived Projects Section -->
          <section class="settings-section">
            <div class="section-header">
              <label class="section-label">Projetos arquivados</label>
              <span class="section-hint">Projetos arquivados não aparecem no seletor principal de tarefas.</span>
            </div>

            @if (isLoadingProjects()) {
              <div class="loading-hint">Carregando projetos arquivados...</div>
            } @else if (archivedProjects().length === 0) {
              <div class="empty-archived">Nenhum projeto arquivado no momento.</div>
            } @else {
              <div class="archived-list">
                @for (project of archivedProjects(); track project.id) {
                  <div class="archived-item">
                    <div class="archived-info">
                      <span class="archived-name">{{ project.name }}</span>
                      @if (project.description) {
                        <span class="archived-desc">{{ project.description }}</span>
                      }
                    </div>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="unarchiveProject(project.id)"
                    >
                      Desarquivar
                    </button>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Session / Logout -->
          <section class="settings-section section-danger-zone">
            <div class="logout-box">
              <div>
                <h4 class="logout-title">Encerrar sessão</h4>
                <p class="logout-desc">Desconectar deste dispositivo e retornar à tela de login.</p>
              </div>
              <button
                id="btn-logout"
                type="button"
                class="btn btn-danger btn-sm"
                (click)="handleLogout()"
              >
                Sair do TODO PRO
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .settings-layout {
      min-height: 100vh;
      background: var(--bg);
    }

    .settings-header {
      height: 60px;
      border-bottom: 1px solid var(--border);
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 900px;
      margin: 0 auto;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
      transition: color var(--transition-fast);
      text-decoration: none;
    }

    .back-link:hover {
      color: var(--text);
    }

    .logo-mini {
      font-size: 1rem;
      font-weight: 700;
      color: #FFFFFF;
    }

    .highlight {
      color: var(--primary);
    }

    .settings-content {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1.5rem;
    }

    .settings-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem;
      box-shadow: var(--shadow-md);
    }

    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .settings-section {
      padding: 1.5rem 0;
      border-top: 1px solid var(--border);
    }

    .section-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.4rem;
    }

    .section-hint {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    .email-display {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 0.6rem 1rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .user-email {
      color: var(--text);
      font-weight: 500;
    }

    .name-edit-group {
      display: flex;
      gap: 0.75rem;
      max-width: 420px;
    }

    .archived-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .archived-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.65rem 0.85rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }

    .archived-info {
      display: flex;
      flex-direction: column;
    }

    .archived-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .archived-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .empty-archived, .loading-hint {
      font-size: 0.8125rem;
      color: var(--text-muted);
      padding: 0.5rem 0;
    }

    .section-danger-zone {
      margin-top: 1rem;
      padding-bottom: 0;
    }

    .logout-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .logout-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.2rem;
    }

    .logout-desc {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    @media (max-width: 640px) {
      .logout-box {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class SettingsComponent implements OnInit {
  private auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private projectService = inject(ProjectService);
  private toast = inject(ToastService);
  private router = inject(Router);

  userEmail = signal<string>('carregando...');
  displayName = '';
  isSavingName = signal(false);
  archivedProjects = signal<Project[]>([]);
  isLoadingProjects = signal(true);

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (user?.email) {
      this.userEmail.set(user.email);
    } else {
      this.userEmail.set('usuario@todopro.app');
    }

    if (user) {
      try {
        const profile = await this.profileService.getProfile();
        if (profile?.display_name) {
          this.displayName = profile.display_name;
        }
      } catch {
        // ignore
      }
    }

    await this.loadArchivedProjects();
  }

  async loadArchivedProjects(): Promise<void> {
    this.isLoadingProjects.set(true);
    try {
      const all = await this.projectService.getProjects(true);
      this.archivedProjects.set(all.filter((p) => p.archived));
    } catch {
      // ignore
    } finally {
      this.isLoadingProjects.set(false);
    }
  }

  async saveDisplayName(): Promise<void> {
    const name = this.displayName.trim();
    if (!name) return;

    this.isSavingName.set(true);
    try {
      await this.profileService.updateProfile({ display_name: name });
      this.toast.success('Nome atualizado com sucesso!');
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao atualizar nome.');
    } finally {
      this.isSavingName.set(false);
    }
  }

  async unarchiveProject(projectId: string): Promise<void> {
    try {
      await this.projectService.archiveProject(projectId, false);
      this.toast.success('Projeto desarquivado com sucesso!');
      await this.loadArchivedProjects();
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao desarquivar projeto.');
    }
  }

  async handleLogout(): Promise<void> {
    await this.auth.signOut();
    this.toast.info('Sessão encerrada.');
    this.router.navigate(['/auth']);
  }
}

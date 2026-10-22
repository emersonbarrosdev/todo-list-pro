import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkMode, Profile } from '../../core/models/profile.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
          <p class="page-subtitle">Gerencie suas preferências de uso e sessão no TODO PRO.</p>

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

          <!-- Default Work Mode -->
          <section class="settings-section">
            <div class="section-header">
              <label class="section-label">Modo de trabalho padrão</label>
              <span class="section-hint">Personaliza os campos exibidos nas suas tarefas</span>
            </div>

            <div class="mode-cards">
              <!-- General -->
              <div
                class="mode-card"
                [class.active]="selectedMode() === 'general'"
                (click)="selectMode('general')"
              >
                <div class="mode-card-header">
                  <div class="mode-icon mode-icon-general">📝</div>
                  <h3 class="mode-name">Uso Geral</h3>
                </div>
                <p class="mode-desc">Ideal para tarefas diárias, foco em simplicidade, prazos e checklists.</p>
              </div>

              <!-- Dev -->
              <div
                class="mode-card"
                [class.active]="selectedMode() === 'dev'"
                (click)="selectMode('dev')"
              >
                <div class="mode-card-header">
                  <div class="mode-icon mode-icon-dev">💻</div>
                  <h3 class="mode-name">Desenvolvimento</h3>
                </div>
                <p class="mode-desc">Campos para branches, pull requests, tipos (Feature, Bug, Refactor) e projetos.</p>
              </div>

              <!-- QA -->
              <div
                class="mode-card"
                [class.active]="selectedMode() === 'qa'"
                (click)="selectMode('qa')"
              >
                <div class="mode-card-header">
                  <div class="mode-icon mode-icon-qa">🧪</div>
                  <h3 class="mode-name">QA / Testes</h3>
                </div>
                <p class="mode-desc">Campos de severidade, passos para reproduzir, resultado esperado e evidências.</p>
              </div>
            </div>

            <div class="save-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="savePreferences()"
                [disabled]="isSaving()"
              >
                @if (isSaving()) {
                  <span>Salvando...</span>
                } @else {
                  <span>Salvar preferência</span>
                }
              </button>
            </div>
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
      margin-bottom: 0.35rem;
    }

    .section-hint {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
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

    .mode-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .mode-card {
      background: var(--surface-secondary);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .mode-card:hover {
      background: var(--surface-hover);
      border-color: var(--text-muted);
    }

    .mode-card.active {
      background: var(--surface-hover);
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary), 0 4px 16px rgba(139, 92, 246, 0.15);
    }

    .mode-card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .mode-icon {
      font-size: 1.25rem;
    }

    .mode-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text);
    }

    .mode-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .save-actions {
      display: flex;
      justify-content: flex-end;
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

    @media (max-width: 768px) {
      .mode-cards {
        grid-template-columns: 1fr;
      }
      .logout-box {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private auth = inject(AuthService);
  private profileService = inject(ProfileService);
  private toast = inject(ToastService);
  private router = inject(Router);

  userEmail = signal<string>('carregando...');
  selectedMode = signal<WorkMode>('general');
  isSaving = signal<boolean>(false);

  async ngOnInit() {
    const user = this.auth.currentUser();
    if (user?.email) {
      this.userEmail.set(user.email);
    } else {
      this.userEmail.set('usuario@todopro.app');
    }

    if (user) {
      try {
        const profile = await this.profileService.getProfile();
        if (profile?.work_mode) {
          this.selectedMode.set(profile.work_mode);
        }
      } catch {
        // fallback
      }
    }
  }

  selectMode(mode: WorkMode) {
    this.selectedMode.set(mode);
  }

  async savePreferences() {
    this.isSaving.set(true);
    try {
      await this.profileService.setWorkMode(this.selectedMode());
      this.toast.success('Modo de trabalho salvo com sucesso!');
    } catch (err: any) {
      this.toast.error(err.message || 'Erro ao salvar preferência.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async handleLogout() {
    await this.auth.signOut();
    this.toast.info('Sessão encerrada.');
    this.router.navigate(['/auth']);
  }
}

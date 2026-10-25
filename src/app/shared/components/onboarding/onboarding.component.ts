import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="onboarding-overlay">
      <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div class="onboarding-badge">Boas-vindas ao TODO PRO</div>
        <h2 id="onboarding-title" class="onboarding-title">Crie seu primeiro projeto</h2>
        <p class="onboarding-subtitle">
          O TODO PRO organiza suas tarefas por projetos pessoais de forma leve e rápida.
        </p>

        <form (ngSubmit)="confirmProject()" class="onboarding-form">
          <div class="input-group">
            <label for="initial-project-name" class="input-label">Nome do projeto</label>
            <input
              id="initial-project-name"
              type="text"
              class="input project-input"
              [(ngModel)]="projectName"
              name="projectName"
              placeholder="Ex: Narrativa Studio, TODO PRO, Site pessoal..."
              required
              autofocus
            />
          </div>

          <button
            id="btn-confirm-onboarding"
            type="submit"
            class="btn btn-primary btn-block"
            [disabled]="!projectName.trim()"
          >
            <span>Criar projeto</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-overlay {
      position: fixed;
      inset: 0;
      background: rgba(8, 8, 14, 0.85);
      backdrop-filter: blur(8px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fade-in 180ms ease-out;
    }

    .onboarding-modal {
      width: 100%;
      max-width: 480px;
      background: #161622;
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 2.25rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
      text-align: center;
      animation: modal-scale 200ms ease-out;
    }

    .onboarding-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.15);
      color: #C4B5FD;
      border: 1px solid rgba(139, 92, 246, 0.3);
      margin-bottom: 1rem;
    }

    .onboarding-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      color: #FFFFFF;
    }

    .onboarding-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0 auto 1.75rem;
      line-height: 1.5;
    }

    .onboarding-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      text-align: left;
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .input-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
    }

    .project-input {
      padding: 0.65rem 0.85rem;
      font-size: 0.9375rem;
      background: var(--surface-secondary);
      border: 1px solid var(--border);
      color: #FFFFFF;
      border-radius: var(--radius-sm);
    }

    .project-input:focus {
      border-color: var(--primary);
    }

    .btn-block {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modal-scale {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
  `],
})
export class OnboardingComponent {
  @Output() projectCreated = new EventEmitter<string>();

  projectName = '';

  confirmProject(): void {
    const trimmed = this.projectName.trim();
    if (trimmed) {
      this.projectCreated.emit(trimmed);
    }
  }
}

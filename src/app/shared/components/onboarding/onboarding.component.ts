import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkMode } from '../../../core/models/profile.model';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="onboarding-overlay">
      <div class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div class="onboarding-badge">Boas-vindas ao TODO PRO</div>
        <h2 id="onboarding-title" class="onboarding-title">Como você pretende usar o TODO PRO?</h2>
        <p class="onboarding-subtitle">
          Personalizaremos os campos e visualizações das suas tarefas de acordo com seu fluxo de trabalho. Você poderá mudar isso a qualquer momento.
        </p>

        <div class="cards-grid">
          <!-- General -->
          <div
            class="choice-card"
            [class.selected]="selectedMode === 'general'"
            (click)="selectedMode = 'general'"
          >
            <div class="card-icon">📝</div>
            <h3 class="card-title">Uso geral</h3>
            <p class="card-desc">Organização pessoal ou profissional simples, rápida, com prazos, prioridades e checklists.</p>
          </div>

          <!-- Dev -->
          <div
            class="choice-card"
            [class.selected]="selectedMode === 'dev'"
            (click)="selectedMode = 'dev'"
          >
            <div class="card-icon">💻</div>
            <h3 class="card-title">Desenvolvimento</h3>
            <p class="card-desc">Focado em engenharia de software: features, bugs, branches, pull requests e critérios de aceite.</p>
          </div>

          <!-- QA -->
          <div
            class="choice-card"
            [class.selected]="selectedMode === 'qa'"
            (click)="selectedMode = 'qa'"
          >
            <div class="card-icon">🧪</div>
            <h3 class="card-title">QA / Testes</h3>
            <p class="card-desc">Ideal para qualidade: testes, bugs, regressões, níveis de severidade, passos de reprodução e evidências.</p>
          </div>
        </div>

        <button
          id="btn-confirm-onboarding"
          type="button"
          class="btn btn-primary btn-block"
          (click)="confirmSelection()"
        >
          <span>Começar a usar o TODO PRO</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
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
      max-width: 680px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow: var(--shadow-lg);
      text-align: center;
      animation: modal-scale 200ms ease-out;
    }

    .onboarding-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--primary-soft);
      color: var(--accent);
      border: 1px solid rgba(139, 92, 246, 0.3);
      margin-bottom: 1rem;
    }

    .onboarding-title {
      font-size: 1.625rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }

    .onboarding-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      max-width: 520px;
      margin: 0 auto 2rem;
      line-height: 1.5;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
      text-align: left;
    }

    .choice-card {
      background: var(--surface-secondary);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .choice-card:hover {
      background: var(--surface-hover);
      border-color: var(--text-muted);
    }

    .choice-card.selected {
      background: var(--surface-hover);
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary), 0 4px 16px rgba(139, 92, 246, 0.2);
    }

    .card-icon {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }

    .card-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text);
    }

    .card-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .btn-block {
      width: 100%;
      padding: 0.8rem;
      font-size: 0.9375rem;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modal-scale {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 640px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
      .onboarding-modal {
        padding: 1.5rem;
      }
    }
  `]
})
export class OnboardingComponent {
  @Output() completed = new EventEmitter<WorkMode>();

  selectedMode: WorkMode = 'general';

  confirmSelection() {
    this.completed.emit(this.selectedMode);
  }
}

import { Component, ElementRef, OnInit, ViewChildren, QueryList, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <!-- Logo -->
        <div class="auth-brand">
          <div class="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1 class="brand-title">TODO <span class="highlight">PRO</span></h1>
          <p class="brand-subtitle">Simplicidade, velocidade e foco nas suas tarefas.</p>
        </div>

        <!-- Step 1: Email Form -->
        @if (step() === 'email') {
          <form [formGroup]="emailForm" (ngSubmit)="handleSendOtp()" class="auth-form">
            <div class="form-group">
              <label for="email-input" class="form-label">E-mail corporativo ou pessoal</label>
              <div class="input-wrapper">
                <input
                  id="email-input"
                  type="email"
                  class="input"
                  placeholder="voce@exemplo.com"
                  formControlName="email"
                  autocomplete="email"
                  autofocus
                />
              </div>
              @if (emailForm.get('email')?.touched && emailForm.get('email')?.invalid) {
                <span class="field-error">Por favor, informe um endereço de e-mail válido.</span>
              }
            </div>

            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                {{ errorMessage() }}
              </div>
            }

            @if (turnstileSiteKey) {
              <div id="turnstile-container" class="turnstile-box"></div>
            }

            <button
              id="btn-continue"
              type="submit"
              class="btn btn-primary btn-block"
              [disabled]="emailForm.invalid || isLoading()"
            >
              @if (isLoading()) {
                <span class="spinner"></span>
                <span>Enviando código...</span>
              } @else {
                <span>Continuar com e-mail</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              }
            </button>

            <p class="auth-notice">
              Enviaremos um código de verificação seguro de 6 dígitos. Sem senha para memorizar.
            </p>
          </form>
        }

        <!-- Step 2: OTP Verification -->
        @if (step() === 'otp') {
          <div class="otp-container">
            <div class="otp-header">
              <h2 class="otp-title">Verifique seu e-mail</h2>
              <p class="otp-subtitle">
                Digite o código de 6 dígitos enviado para:
                <strong class="email-highlight">{{ emailForm.value.email }}</strong>
              </p>
            </div>

            <!-- 6-digit boxes -->
            <div class="otp-inputs" (paste)="handlePaste($event)">
              @for (digit of otpDigits; track $index) {
                <input
                  #otpInput
                  type="text"
                  inputmode="numeric"
                  maxlength="1"
                  class="otp-digit"
                  [value]="otpDigits[$index]"
                  (input)="handleDigitInput($event, $index)"
                  (keydown)="handleDigitKeydown($event, $index)"
                  [attr.aria-label]="'Dígito ' + ($index + 1)"
                />
              }
            </div>

            @if (errorMessage()) {
              <div class="error-banner" role="alert">
                {{ errorMessage() }}
              </div>
            }

            <button
              id="btn-verify-otp"
              type="button"
              class="btn btn-primary btn-block"
              (click)="handleVerifyOtp()"
              [disabled]="isOtpIncomplete || isLoading()"
            >
              @if (isLoading()) {
                <span class="spinner"></span>
                <span>Autenticando...</span>
              } @else {
                <span>Confirmar e entrar</span>
              }
            </button>

            <div class="otp-footer">
              @if (resendCountdown() > 0) {
                <span class="resend-countdown">Reenviar código em {{ resendCountdown() }}s</span>
              } @else {
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  (click)="handleResendOtp()"
                  [disabled]="isLoading()"
                >
                  Reenviar código
                </button>
              }

              <button
                type="button"
                class="btn btn-ghost btn-sm btn-change-email"
                (click)="step.set('email')"
              >
                Alterar e-mail
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), var(--bg);
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2.25rem;
      box-shadow: var(--shadow-lg);
      animation: card-appear 200ms ease-out;
    }

    .auth-brand {
      text-align: center;
      margin-bottom: 2rem;
    }

    .brand-icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 0.85rem;
      border-radius: var(--radius-md);
      background: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
    }

    .brand-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      margin-bottom: 0.35rem;
    }

    .highlight {
      color: var(--primary);
    }

    .brand-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .field-error {
      font-size: 0.75rem;
      color: var(--danger);
    }

    .error-banner {
      background: var(--danger-soft);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      font-size: 0.8125rem;
      color: #FCA5A5;
    }

    .turnstile-box {
      min-height: 65px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0.25rem 0;
    }

    .btn-block {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 0.9375rem;
    }

    .auth-notice {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    /* OTP Screen */
    .otp-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .otp-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
    }

    .otp-subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .email-highlight {
      display: block;
      color: var(--text);
      margin-top: 0.2rem;
    }

    .otp-inputs {
      display: flex;
      justify-content: center;
      gap: 0.6rem;
      margin-bottom: 1.5rem;
    }

    .otp-digit {
      width: 48px;
      height: 56px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text);
      background: var(--surface-secondary);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      outline: none;
      transition: all var(--transition-fast);
    }

    .otp-digit:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--primary-soft);
      background: var(--surface-hover);
    }

    .otp-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    .resend-countdown {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .btn-change-email {
      color: var(--text-muted);
    }
    .btn-change-email:hover {
      color: var(--text);
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes card-appear {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class AuthComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  @ViewChildren('otpInput') otpInputRefs!: QueryList<ElementRef<HTMLInputElement>>;

  step = signal<'email' | 'otp'>('email');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  resendCountdown = signal<number>(0);
  otpDigits: string[] = ['', '', '', '', '', ''];

  turnstileSiteKey = environment.turnstileSiteKey || '';
  turnstileToken: string | null = null;

  emailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  private countdownTimer: any = null;

  ngOnInit(): void {
    // Check if user is already authenticated
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
      return;
    }

    if (this.turnstileSiteKey && typeof window !== 'undefined') {
      this.initTurnstile();
    }
  }

  private initTurnstile() {
    if (!this.turnstileSiteKey) return;
    const scriptId = 'cf-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => this.renderTurnstile();
      document.head.appendChild(script);
    } else {
      setTimeout(() => this.renderTurnstile(), 100);
    }
  }

  private renderTurnstile() {
    const el = document.getElementById('turnstile-container');
    const w = window as any;
    if (el && w.turnstile) {
      try {
        w.turnstile.render('#turnstile-container', {
          sitekey: this.turnstileSiteKey,
          callback: (token: string) => {
            this.turnstileToken = token;
          },
          'expired-callback': () => {
            this.turnstileToken = null;
          },
        });
      } catch {
        // ignore if already rendered
      }
    }
  }

  get isOtpIncomplete(): boolean {
    return this.otpDigits.some((d) => d.trim() === '');
  }

  async handleSendOtp() {
    if (this.emailForm.invalid) return;

    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      const email = this.emailForm.value.email;
      await this.auth.sendOtp(email, this.turnstileToken || undefined);
      this.step.set('otp');
      this.startCountdown(60);
      this.toast.info('Código de verificação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => this.focusFirstDigit(), 100);
    } catch (err: any) {
      // Safe generic message avoiding account enumeration
      this.errorMessage.set(
        err.message?.includes('rate limit')
          ? 'Muitas solicitações. Aguarde um momento e tente novamente.'
          : err.message || 'Não foi possível enviar o código. Tente novamente.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleVerifyOtp() {
    const token = this.otpDigits.join('').trim();
    if (token.length !== 6) return;

    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      const email = this.emailForm.value.email;
      const success = await this.auth.verifyOtp(email, token);
      if (success) {
        this.toast.success('Login realizado com sucesso!');
        this.router.navigate(['/']);
      } else {
        this.errorMessage.set('Código inválido ou expirado. Tente novamente.');
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Código incorreto. Por favor, tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleResendOtp() {
    if (this.resendCountdown() > 0) return;
    await this.handleSendOtp();
  }

  handleDigitInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    if (value) {
      this.otpDigits[index] = value.slice(-1);
      input.value = this.otpDigits[index];

      // Auto advance to next input
      if (index < 5) {
        const nextInput = this.otpInputRefs.toArray()[index + 1]?.nativeElement;
        if (nextInput) nextInput.focus();
      } else {
        // If completed all 6 digits, auto trigger verify
        if (!this.isOtpIncomplete) {
          this.handleVerifyOtp();
        }
      }
    } else {
      this.otpDigits[index] = '';
    }
  }

  handleDigitKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      const prevInput = this.otpInputRefs.toArray()[index - 1]?.nativeElement;
      if (prevInput) {
        prevInput.focus();
        this.otpDigits[index - 1] = '';
        prevInput.value = '';
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.otpInputRefs.toArray()[index - 1]?.nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.otpInputRefs.toArray()[index + 1]?.nativeElement.focus();
    }
  }

  handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const digits = pasted.replace(/\D/g, '').slice(0, 6).split('');

    if (digits.length > 0) {
      digits.forEach((d, i) => {
        if (i < 6) this.otpDigits[i] = d;
      });

      const inputElements = this.otpInputRefs.toArray();
      inputElements.forEach((el, i) => {
        el.nativeElement.value = this.otpDigits[i] || '';
      });

      const focusIdx = Math.min(digits.length, 5);
      inputElements[focusIdx]?.nativeElement.focus();

      if (digits.length === 6) {
        this.handleVerifyOtp();
      }
    }
  }

  private focusFirstDigit() {
    const firstInput = this.otpInputRefs?.first?.nativeElement;
    if (firstInput) {
      firstInput.focus();
    }
  }

  private startCountdown(seconds: number) {
    this.resendCountdown.set(seconds);
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 1) {
        clearInterval(this.countdownTimer);
        this.resendCountdown.set(0);
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }
}

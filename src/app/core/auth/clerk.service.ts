import { Injectable, computed, signal } from '@angular/core';
import { Clerk } from '@clerk/clerk-js';
import { environment } from '../../../environments/environment';

export interface ClerkUser {
  id: string;
  email: string;
  name: string;
}

export interface ClerkAuthState {
  user: ClerkUser | null;
  loaded: boolean;
  loading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ClerkService {
  private clerkInstance: Clerk | null = null;
  private pendingEmail: string = '';
  private authFlow: 'sign_in' | 'sign_up' = 'sign_in';
  private initPromise: Promise<void> | null = null;

  private state = signal<ClerkAuthState>({
    user: null,
    loaded: false,
    loading: true,
  });

  readonly currentUser = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => !!this.state().user);
  readonly isLoaded = computed(() => this.state().loaded);
  readonly isLoading = computed(() => this.state().loading);

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // In test or non-browser environment
      if (typeof window === 'undefined' || !environment.clerkPublishableKey || environment.clerkPublishableKey.includes('placeholder')) {
        this.restoreLocalMockSession();
        return;
      }

      try {
        const clerk = new Clerk(environment.clerkPublishableKey);
        await clerk.load({
          standardBrowser: true,
          touchSession: false,
        });

        this.clerkInstance = clerk;

        this.syncUserState();

        // Listen for user / session changes without triggering API reloads
        clerk.addListener(() => {
          this.syncUserState();
        });
      } catch {
        this.restoreLocalMockSession();
      }
    })();

    return this.initPromise;
  }

  private syncUserState(): void {
    if (!this.clerkInstance) return;

    const user = this.clerkInstance.user;
    if (user) {
      const email = user.primaryEmailAddress?.emailAddress || '';
      const name = user.fullName || user.firstName || email.split('@')[0] || 'Usuário';

      this.state.set({
        user: { id: user.id, email, name },
        loaded: true,
        loading: false,
      });
    } else {
      this.state.set({
        user: null,
        loaded: true,
        loading: false,
      });
    }
  }

  private restoreLocalMockSession(): void {
    try {
      const saved = localStorage.getItem('todo_pro_clerk_mock_user');
      if (saved) {
        const user = JSON.parse(saved);
        this.state.set({ user, loaded: true, loading: false });
        return;
      }
    } catch {
      // ignore
    }
    this.state.set({ user: null, loaded: true, loading: false });
  }

  async signIn(email: string): Promise<{ success: boolean; message?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    this.pendingEmail = normalizedEmail;

    await this.initialize();

    if (!this.clerkInstance) {
      // Test / mock mode
      localStorage.setItem('todo_pro_pending_email', normalizedEmail);
      return { success: true };
    }

    const client = this.clerkInstance.client;
    if (!client) {
      localStorage.setItem('todo_pro_pending_email', normalizedEmail);
      return { success: true };
    }

    // 1. Tentar primeiro o Sign In (para usuários que já possuem conta)
    try {
      const signInAttempt = await client.signIn.create({
        identifier: normalizedEmail,
      });

      const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
        (f) => f.strategy === 'email_code'
      );

      if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
        await signInAttempt.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId as string,
        });
        this.authFlow = 'sign_in';
        return { success: true };
      }

      const hasPasswordFactor = signInAttempt.supportedFirstFactors?.some(
        (f) => f.strategy === 'password'
      );
      if (hasPasswordFactor) {
        throw new Error(
          'Esta conta exige senha no Clerk. Desative a exigência de senha no painel do Clerk para usar código por e-mail.'
        );
      }

      this.authFlow = 'sign_in';
      return { success: true };
    } catch (signInErr: any) {
      const errCode = signInErr?.errors?.[0]?.code;
      const errMsg = (signInErr?.errors?.[0]?.message || signInErr?.message || '').toLowerCase();
      const isNotFound =
        errCode === 'form_identifier_not_found' ||
        errMsg.includes("couldn't find your account") ||
        errMsg.includes('not found') ||
        errMsg.includes('não foi possível encontrar sua conta');

      // Se não for "conta não encontrada", repassa o erro original (ex: rate limit ou e-mail inválido)
      if (!isNotFound) {
        const msg =
          signInErr?.errors?.[0]?.longMessage ||
          signInErr?.errors?.[0]?.message ||
          signInErr?.message ||
          'Falha ao iniciar acesso.';
        throw new Error(msg);
      }

      // 2. Novo usuário (esposa, irmão, equipe): iniciar fluxo de cadastro (Sign Up)
      try {
        const signUpAttempt = await client.signUp.create({
          emailAddress: normalizedEmail,
        });

        await signUpAttempt.prepareEmailAddressVerification({
          strategy: 'email_code',
        });

        this.authFlow = 'sign_up';
        return { success: true };
      } catch (signUpErr: any) {
        const signUpCode = signUpErr?.errors?.[0]?.code;
        if (signUpCode === 'sign_up_disabled' || signUpCode === 'identifier_not_allowed') {
          throw new Error(
            'Novos cadastros estão restritos no painel do Clerk (Configure > User & Authentication > Restrictions).'
          );
        }

        const msg =
          signUpErr?.errors?.[0]?.longMessage ||
          signUpErr?.errors?.[0]?.message ||
          signUpErr?.message ||
          'Falha ao cadastrar e enviar código para este e-mail.';
        throw new Error(msg);
      }
    }
  }

  async verifyCode(code: string): Promise<boolean> {
    const cleanCode = code.trim();
    await this.initialize();

    if (!this.clerkInstance || !this.clerkInstance.client) {
      // Mock mode
      const email = this.pendingEmail || localStorage.getItem('todo_pro_pending_email') || 'dev@todopro.com';
      const userHash = email.replace(/[^a-z0-9]/gi, '_');
      const mockUser: ClerkUser = {
        id: `clerk_user_${userHash}`,
        email,
        name: email.split('@')[0],
      };
      localStorage.setItem('todo_pro_clerk_mock_user', JSON.stringify(mockUser));
      this.state.set({ user: mockUser, loaded: true, loading: false });
      return true;
    }

    const client = this.clerkInstance.client;

    try {
      // 1. Fluxo de Sign Up (novo usuário cadastrado)
      if (this.authFlow === 'sign_up' || client.signUp?.status === 'missing_requirements') {
        const completeSignUp = await client.signUp.attemptEmailAddressVerification({
          code: cleanCode,
        });

        if (completeSignUp.status === 'complete' && completeSignUp.createdSessionId) {
          await this.clerkInstance.setActive({ session: completeSignUp.createdSessionId });
          this.syncUserState();
          return true;
        }

        // Se o painel do Clerk exigir senha ou nome para cadastro
        if (completeSignUp.status === 'missing_requirements') {
          const updatePayload: any = {};
          if (completeSignUp.missingFields?.includes('password')) {
            updatePayload.password = 'Pwd_' + crypto.randomUUID().replace(/-/g, '') + '_!9aZ#';
          }
          if (completeSignUp.missingFields?.includes('first_name')) {
            updatePayload.firstName = (this.pendingEmail || 'user').split('@')[0];
          }

          if (Object.keys(updatePayload).length > 0) {
            const finalizedSignUp = await client.signUp.update(updatePayload);
            if (finalizedSignUp.status === 'complete' && finalizedSignUp.createdSessionId) {
              await this.clerkInstance.setActive({ session: finalizedSignUp.createdSessionId });
              this.syncUserState();
              return true;
            }
          }
        }

        return false;
      }

      // 2. Fluxo de Sign In (usuário existente)
      const completeSignIn = await client.signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: cleanCode,
      });

      if (completeSignIn.status === 'complete' && completeSignIn.createdSessionId) {
        await this.clerkInstance.setActive({ session: completeSignIn.createdSessionId });
        this.syncUserState();
        return true;
      }

      // Se a verificação for transferível para cadastro
      if ((completeSignIn as any).firstFactorVerification?.status === 'transferable') {
        const completeSignUp = await client.signUp.create({
          transfer: true,
        });

        if (completeSignUp.status === 'complete' && completeSignUp.createdSessionId) {
          await this.clerkInstance.setActive({ session: completeSignUp.createdSessionId });
          this.syncUserState();
          return true;
        }

        if (
          completeSignUp.status === 'missing_requirements' &&
          completeSignUp.missingFields?.includes('password')
        ) {
          const autoPassword = 'Pwd_' + crypto.randomUUID().replace(/-/g, '') + '_!9aZ#';
          const finalizedSignUp = await client.signUp.update({
            password: autoPassword,
          });

          if (finalizedSignUp.status === 'complete' && finalizedSignUp.createdSessionId) {
            await this.clerkInstance.setActive({ session: finalizedSignUp.createdSessionId });
            this.syncUserState();
            return true;
          }
        }
      }

      return false;
    } catch (err: any) {
      // Fallback de segurança: se falhar no sign_in e houver signUp pendente
      if (this.authFlow === 'sign_in' && client.signUp?.status === 'missing_requirements') {
        try {
          const completeSignUp = await client.signUp.attemptEmailAddressVerification({
            code: cleanCode,
          });
          if (completeSignUp.status === 'complete' && completeSignUp.createdSessionId) {
            await this.clerkInstance.setActive({ session: completeSignUp.createdSessionId });
            this.syncUserState();
            return true;
          }
        } catch {
          // prossegue com o erro principal
        }
      }

      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Código inválido ou expirado.';
      throw new Error(msg);
    }
  }

  async signOut(): Promise<void> {
    if (this.clerkInstance) {
      await this.clerkInstance.signOut();
    }
    this.authFlow = 'sign_in';
    this.pendingEmail = '';
    localStorage.removeItem('todo_pro_clerk_mock_user');
    localStorage.removeItem('todo_pro_pending_email');
    this.state.set({ user: null, loaded: true, loading: false });
  }

  async getToken(): Promise<string | null> {
    await this.initialize();
    if (this.clerkInstance?.session) {
      return this.clerkInstance.session.getToken();
    }
    if (this.clerkInstance && this.state().loading) {
      let waitMs = 0;
      while (this.state().loading && waitMs < 1500) {
        await new Promise((r) => setTimeout(r, 50));
        waitMs += 50;
      }
      if (this.clerkInstance.session) {
        return this.clerkInstance.session.getToken();
      }
    }
    const mockUser = this.currentUser();
    if (mockUser) {
      return `mock_token_${mockUser.id}`;
    }
    return null;
  }

  getCurrentUser(): ClerkUser | null {
    return this.currentUser();
  }
}

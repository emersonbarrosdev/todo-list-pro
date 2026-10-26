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

    try {
      // Official Clerk Passwordless Flow: signUpIfMissing avoids 422 for new users
      const signInAttempt = await client.signIn.create({
        identifier: normalizedEmail,
        signUpIfMissing: true,
      });

      const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
        (f) => f.strategy === 'email_code'
      );

      if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
        await signInAttempt.prepareFirstFactor({
          strategy: 'email_code',
          emailAddressId: emailCodeFactor.emailAddressId as string,
        });
        return { success: true };
      }

      // Check if password factor is required
      const hasPasswordFactor = signInAttempt.supportedFirstFactors?.some(
        (f) => f.strategy === 'password'
      );
      if (hasPasswordFactor) {
        throw new Error(
          'No painel do Clerk, desative a exigência de senha e ative o código por e-mail para autenticação passwordless.'
        );
      }

      return { success: true };
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Falha ao enviar código.';
      throw new Error(msg);
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
      // 1. Attempt first factor verification on the sign-in
      const completeSignIn = await client.signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: cleanCode,
      });

      if (completeSignIn.status === 'complete' && completeSignIn.createdSessionId) {
        await this.clerkInstance.setActive({ session: completeSignIn.createdSessionId });
        this.syncUserState();
        return true;
      }

      // 2. If user did not exist, Clerk flags firstFactorVerification as transferable
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
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Código inválido ou expirado.';
      throw new Error(msg);
    }
  }

  async signOut(): Promise<void> {
    if (this.clerkInstance) {
      await this.clerkInstance.signOut();
    }
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

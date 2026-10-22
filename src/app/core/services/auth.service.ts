import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);

  private state = signal<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  readonly currentUser = computed(() => this.state().user);
  readonly session = computed(() => this.state().session);
  readonly isLoading = computed(() => this.state().loading);
  readonly isAuthenticated = computed(() => !!this.state().user);

  constructor() {
    this.initSession();
  }

  private async initSession() {
    const client = this.supabase.getClient();
    if (!this.supabase.isConfigured || !client) {
      // Check mock session
      const mockSaved = localStorage.getItem('todo_pro_mock_auth');
      if (mockSaved) {
        try {
          const parsed = JSON.parse(mockSaved);
          this.state.set({ user: parsed.user, session: parsed.session, loading: false });
          return;
        } catch {
          // ignore
        }
      }
      this.state.set({ user: null, session: null, loading: false });
      return;
    }

    try {
      const { data } = await client.auth.getSession();
      this.state.set({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
      });

      client.auth.onAuthStateChange((_event, session) => {
        this.state.set({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      });
    } catch {
      this.state.set({ user: null, session: null, loading: false });
    }
  }

  async sendOtp(email: string, captchaToken?: string): Promise<{ success: boolean; message?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const client = this.supabase.getClient();

    if (!this.supabase.isConfigured || !client) {
      // Mock OTP mode for dev/test when credentials are not yet provided
      localStorage.setItem('todo_pro_pending_email', normalizedEmail);
      return { success: true };
    }

    const options: { shouldCreateUser: boolean; captchaToken?: string } = {
      shouldCreateUser: true,
    };
    if (captchaToken) {
      options.captchaToken = captchaToken;
    }

    const { error } = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  async verifyOtp(email: string, token: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    const client = this.supabase.getClient();

    if (!this.supabase.isConfigured || !client) {
      // Mock verification mode
      const userHash = normalizedEmail.replace(/[^a-z0-9]/gi, '_');
      const mockUser: User = {
        id: `mock-user-${userHash}`,
        app_metadata: {},
        user_metadata: { full_name: 'Usuário Demonstração' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: normalizedEmail,
      };
      const mockSession: Session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser,
      };
      localStorage.setItem('todo_pro_mock_auth', JSON.stringify({ user: mockUser, session: mockSession }));
      this.state.set({ user: mockUser, session: mockSession, loading: false });
      return true;
    }

    const { data, error } = await client.auth.verifyOtp({
      email: normalizedEmail,
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      this.state.set({
        user: data.session.user,
        session: data.session,
        loading: false,
      });
      return true;
    }

    return false;
  }

  async signOut(): Promise<void> {
    const client = this.supabase.getClient();
    if (this.supabase.isConfigured && client) {
      await client.auth.signOut();
    }
    localStorage.removeItem('todo_pro_mock_auth');
    localStorage.removeItem('todo_pro_pending_email');
    this.state.set({ user: null, session: null, loading: false });
  }
}

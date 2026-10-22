import { Injectable, computed, inject } from '@angular/core';
import { ClerkService, ClerkUser } from '../auth/clerk.service';

export type User = ClerkUser;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private clerk = inject(ClerkService);

  readonly currentUser = computed(() => this.clerk.currentUser());
  readonly isAuthenticated = computed(() => this.clerk.isAuthenticated());
  readonly isLoading = computed(() => this.clerk.isLoading());
  readonly isLoaded = computed(() => this.clerk.isLoaded());

  async initialize(): Promise<void> {
    return this.clerk.initialize();
  }

  async signIn(email: string, _captchaToken?: string): Promise<{ success: boolean; message?: string }> {
    return this.clerk.signIn(email);
  }

  // Backward compatibility alias for UI form
  async sendOtp(email: string, _captchaToken?: string): Promise<{ success: boolean; message?: string }> {
    return this.signIn(email);
  }

  async verifyCode(code: string): Promise<boolean> {
    return this.clerk.verifyCode(code);
  }

  // Backward compatibility alias for UI form
  async verifyOtp(_email: string, code: string): Promise<boolean> {
    return this.verifyCode(code);
  }

  async signOut(): Promise<void> {
    return this.clerk.signOut();
  }

  async getToken(): Promise<string | null> {
    return this.clerk.getToken();
  }

  getCurrentUser(): ClerkUser | null {
    return this.clerk.getCurrentUser();
  }
}

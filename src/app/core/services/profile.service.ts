import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Profile } from '../models/profile.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private auth = inject(AuthService);

  private defaultProfile(userId: string): Profile {
    const user = this.auth.getCurrentUser();
    return {
      id: userId,
      display_name: user?.name || 'Usuário',
      work_mode: 'general',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const token = await this.auth.getToken();

    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const res = await fetch(`${environment.apiUrl}/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const profile = await res.json();
          this.saveLocalCache(userId, profile);
          return profile;
        }
      } catch {
        // Network offline or worker unavailable: fall back to cache
      }
    }

    return this.getLocalCache(userId) || this.defaultProfile(userId);
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const current = await this.getProfile(userId) || this.defaultProfile(userId);
    const updated: Profile = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Always save local cache first for instant UI response
    this.saveLocalCache(userId, updated);

    const token = await this.auth.getToken();
    if (token && !token.startsWith('mock_token_') && typeof window !== 'undefined') {
      try {
        const res = await fetch(`${environment.apiUrl}/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          const saved = await res.json();
          this.saveLocalCache(userId, saved);
          return saved;
        }
      } catch {
        // Fall back to updated local cache
      }
    }

    return updated;
  }

  async setWorkMode(userId: string, mode: any): Promise<Profile> {
    return this.updateProfile(userId, { work_mode: mode });
  }

  private getLocalCache(userId: string): Profile | null {
    try {
      const item = localStorage.getItem(`todo_pro_profile_${userId}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private saveLocalCache(userId: string, profile: Profile): void {
    try {
      localStorage.setItem(`todo_pro_profile_${userId}`, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }
}

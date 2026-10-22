import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile, WorkMode } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private supabase = inject(SupabaseService);

  private mockProfile: Profile = {
    id: 'mock-user-1',
    display_name: 'Dev Pro',
    work_mode: 'general',
  };

  async getProfile(userId: string): Promise<Profile | null> {
    const client = this.supabase.getClient();
    if (!this.supabase.isConfigured || !client) {
      const stored = localStorage.getItem('todo_pro_mock_profile');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return this.mockProfile;
        }
      }
      return this.mockProfile;
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao carregar perfil: ${error.message}`);
    }

    return data as Profile | null;
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const client = this.supabase.getClient();
    if (!this.supabase.isConfigured || !client) {
      const current = await this.getProfile(userId) || this.mockProfile;
      const updated: Profile = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('todo_pro_mock_profile', JSON.stringify(updated));
      return updated;
    }

    const { data, error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar perfil: ${error.message}`);
    }

    return data as Profile;
  }

  async setWorkMode(userId: string, work_mode: WorkMode): Promise<void> {
    await this.updateProfile(userId, { work_mode });
  }
}

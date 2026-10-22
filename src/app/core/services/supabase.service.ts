import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  public readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(
      environment.supabaseUrl &&
      environment.supabaseKey &&
      !environment.supabaseUrl.includes('placeholder') &&
      !environment.supabaseKey.includes('placeholder')
    );

    try {
      this.client = createClient(
        environment.supabaseUrl || 'https://placeholder.supabase.co',
        environment.supabaseKey || 'placeholder-anon-key',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }
      );
    } catch {
      this.client = null;
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }
}

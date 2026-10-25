import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Profile } from '../models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private api = inject(ApiClientService);

  /**
   * Fetches the user profile from D1 via Worker API.
   * Executed once on session startup.
   */
  async getProfile(): Promise<Profile> {
    return this.api.get<Profile>('/profile');
  }

  /**
   * Updates user preferences in D1 via a single PUT call.
   */
  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    return this.api.put<Profile>('/profile', updates);
  }
}

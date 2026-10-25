import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';
import { ApiClientService } from './api-client.service';
import { AuthService } from './auth.service';
import { ClerkService } from '../auth/clerk.service';

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ProfileService, ApiClientService, AuthService, ClerkService],
    });
    service = TestBed.inject(ProfileService);
  });

  it('should get default profile when none exists', async () => {
    const profile = await service.getProfile();
    expect(profile).toBeTruthy();
    expect(profile?.display_name).toBeTruthy();
  });

  it('should update display name', async () => {
    const updated = await service.updateProfile({
      display_name: 'Engenheiro Senior',
    });

    expect(updated.display_name).toBe('Engenheiro Senior');
    const retrieved = await service.getProfile();
    expect(retrieved?.display_name).toBe('Engenheiro Senior');
  });
});

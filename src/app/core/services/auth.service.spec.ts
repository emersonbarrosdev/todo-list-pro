import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, SupabaseService],
    });
    service = TestBed.inject(AuthService);
  });

  it('should initialize with null user and session when unauthenticated', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should send OTP and return success', async () => {
    const res = await service.sendOtp('dev@todopro.com');
    expect(res.success).toBe(true);
  });

  it('should verify OTP and authenticate user', async () => {
    await service.sendOtp('dev@todopro.com');
    const success = await service.verifyOtp('dev@todopro.com', '123456');

    expect(success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('dev@todopro.com');
  });

  it('should sign out user and clear session state', async () => {
    await service.sendOtp('dev@todopro.com');
    await service.verifyOtp('dev@todopro.com', '123456');
    expect(service.isAuthenticated()).toBe(true);

    await service.signOut();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.session()).toBeNull();
  });
});

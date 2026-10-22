import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { ClerkService } from '../auth/clerk.service';

describe('AuthService (Clerk)', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, ClerkService],
    });
    service = TestBed.inject(AuthService);
  });

  it('should initialize with null user when unauthenticated', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should send OTP code and return success', async () => {
    const res = await service.signIn('dev@todopro.com');
    expect(res.success).toBe(true);
  });

  it('should verify OTP code and authenticate user', async () => {
    await service.signIn('dev@todopro.com');
    const success = await service.verifyCode('123456');

    expect(success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('dev@todopro.com');
  });

  it('should sign out user and clear session state', async () => {
    await service.signIn('dev@todopro.com');
    await service.verifyCode('123456');
    expect(service.isAuthenticated()).toBe(true);

    await service.signOut();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });
});

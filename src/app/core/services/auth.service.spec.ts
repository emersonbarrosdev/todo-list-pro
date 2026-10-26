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

  it('should allow new users (e.g. wife, brother) to register their email and log in', async () => {
    // 1. Sign in/up with new email
    const res1 = await service.sendOtp('esposa@familia.com');
    expect(res1.success).toBe(true);

    // 2. Verify code
    const verified1 = await service.verifyOtp('esposa@familia.com', '654321');
    expect(verified1).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('esposa@familia.com');

    // 3. Sign out and sign in with brother's email
    await service.signOut();
    expect(service.isAuthenticated()).toBe(false);

    const res2 = await service.sendOtp('irmao@familia.com');
    expect(res2.success).toBe(true);

    const verified2 = await service.verifyOtp('irmao@familia.com', '112233');
    expect(verified2).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('irmao@familia.com');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthComponent } from './auth.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        AuthService,
        ToastService,
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create AuthComponent in email step', () => {
    expect(component).toBeTruthy();
    expect(component.step()).toBe('email');
  });

  it('should validate invalid email', () => {
    component.emailForm.controls['email'].setValue('not-an-email');
    expect(component.emailForm.invalid).toBe(true);
  });

  it('should validate valid email and transition to OTP step', async () => {
    component.emailForm.controls['email'].setValue('developer@test.com');
    expect(component.emailForm.valid).toBe(true);

    await component.handleSendOtp();
    expect(component.step()).toBe('otp');
  });
});

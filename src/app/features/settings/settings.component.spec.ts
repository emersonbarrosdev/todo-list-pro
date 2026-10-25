import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideRouter([]),
        AuthService,
        ProfileService,
        ProjectService,
        ToastService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create settings component', () => {
    expect(component).toBeTruthy();
  });

  it('should render email display and logout button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.email-display')).toBeTruthy();
    expect(compiled.querySelector('#btn-logout')).toBeTruthy();
  });
});

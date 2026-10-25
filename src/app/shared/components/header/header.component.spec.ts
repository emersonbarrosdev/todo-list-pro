import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../../core/services/auth.service';
import { ClerkService } from '../../../core/auth/clerk.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        AuthService,
        ClerkService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
  });

  it('should render single "+ Nova tarefa" button and no duplicate', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('#btn-header-new-task');
    expect(buttons.length).toBe(1);
    expect(compiled.textContent).toContain('Nova tarefa');
  });

  it('should NOT render the legacy "Geral" work mode chip or isolated gear icon', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.mode-pill')).toBeNull();
    expect(compiled.querySelector('a[href="/settings"]')).toBeNull();
  });

  it('should render user identity with avatar initials and short name', async () => {
    await authService.signIn('emerson.sbarros3@gmail.com');
    await authService.verifyCode('123456');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const avatarBadge = compiled.querySelector('.avatar-badge');
    expect(avatarBadge?.textContent?.trim()).toBe('EM');

    const nameSpan = compiled.querySelector('.user-chip-name');
    expect(nameSpan?.textContent?.trim()).toBe('Emerson.sbarros3');
  });

  it('should toggle user menu on click without calling any API', () => {
    fixture.detectChanges();
    expect(component.showUserMenu()).toBe(false);

    const event = new MouseEvent('click');
    component.toggleUserMenu(event);
    expect(component.showUserMenu()).toBe(true);

    component.onDocumentClick();
    expect(component.showUserMenu()).toBe(false);
  });

  it('should toggle project menu and emit project selection', () => {
    component.projects = [
      {
        id: 'p1',
        user_id: 'u1',
        name: 'Narrativa Studio',
        archived: false,
        created_at: '',
        updated_at: '',
      },
    ];
    let selected = '';
    component.projectChanged.subscribe((id) => (selected = id));

    fixture.detectChanges();
    component.onSelectProject('p1');
    expect(selected).toBe('p1');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardingComponent } from './onboarding.component';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render project creation input and button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Crie seu primeiro projeto');
    const input = compiled.querySelector('#initial-project-name');
    expect(input).toBeTruthy();
  });

  it('should emit projectCreated with project name', () => {
    let createdName = '';
    component.projectCreated.subscribe((name) => (createdName = name));

    component.projectName = 'Narrativa Studio';
    component.confirmProject();

    expect(createdName).toBe('Narrativa Studio');
  });
});

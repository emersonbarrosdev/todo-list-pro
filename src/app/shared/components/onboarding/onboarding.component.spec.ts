import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OnboardingComponent } from './onboarding.component';
import { WorkMode } from '../../../core/models/profile.model';

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

  it('should create onboarding component with default general mode', () => {
    expect(component).toBeTruthy();
    expect(component.selectedMode).toBe('general');
  });

  it('should emit completed event with chosen mode', () => {
    let emittedMode: WorkMode | null = null;
    component.completed.subscribe((mode) => {
      emittedMode = mode;
    });

    component.selectedMode = 'dev';
    component.confirmSelection();

    expect(emittedMode).toBe('dev');
  });
});

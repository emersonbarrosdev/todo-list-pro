import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { ApiClientService } from './api-client.service';
import { AuthService } from './auth.service';
import { ClerkService } from '../auth/clerk.service';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [ProjectService, ApiClientService, AuthService, ClerkService],
    });
    service = TestBed.inject(ProjectService);
  });

  it('should get default project if none exists', async () => {
    const projects = await service.getProjects();
    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(projects[0].name).toBe('Meu Projeto');
  });

  it('should create, update, and archive projects', async () => {
    const created = await service.createProject({
      name: 'Narrativa Studio',
      description: 'Estúdio de produção',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Narrativa Studio');
    expect(created.archived).toBe(false);

    const updated = await service.updateProject(created.id, {
      name: 'Narrativa Studio Pro',
    });
    expect(updated.name).toBe('Narrativa Studio Pro');

    const archived = await service.archiveProject(created.id, true);
    expect(archived.archived).toBe(true);

    const activeList = await service.getProjects(false);
    expect(activeList.some((p) => p.id === created.id)).toBe(false);

    const allList = await service.getProjects(true);
    expect(allList.some((p) => p.id === created.id)).toBe(true);
  });
});

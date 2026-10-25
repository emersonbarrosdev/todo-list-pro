import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { Project, CreateProjectDto, UpdateProjectDto } from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private api = inject(ApiClientService);

  /**
   * Fetches projects for the authenticated user.
   * By default, returns active (non-archived) projects.
   */
  async getProjects(includeArchived = false): Promise<Project[]> {
    const endpoint = includeArchived ? '/projects?archived=true' : '/projects';
    return this.api.get<Project[]>(endpoint);
  }

  /**
   * Creates a new personal project.
   */
  async createProject(dto: CreateProjectDto): Promise<Project> {
    return this.api.post<Project>('/projects', dto);
  }

  /**
   * Updates project details (name, description, archived status).
   */
  async updateProject(id: string, updates: UpdateProjectDto): Promise<Project> {
    return this.api.put<Project>(`/projects/${id}`, updates);
  }

  /**
   * Helper to archive or unarchive a project.
   */
  async archiveProject(id: string, archived = true): Promise<Project> {
    return this.updateProject(id, { archived });
  }
}

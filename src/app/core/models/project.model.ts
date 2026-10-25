export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  archived?: boolean;
}

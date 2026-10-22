import { WorkMode } from './profile.model';
export { WorkMode };

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type DevTaskType = 'feature' | 'bug' | 'refactor' | 'chore' | 'docs';
export type QaTaskType = 'test' | 'bug' | 'regression';
export type QaSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DevMetadata {
  type?: DevTaskType;
  project?: string;
  branch?: string;
  environment?: string;
  pr_url?: string;
}

export interface QaMetadata {
  type?: QaTaskType;
  severity?: QaSeverity;
  environment?: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  evidence_url?: string;
}

export type TaskMetadata = DevMetadata & QaMetadata & Record<string, unknown>;

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  tags: string[];
  checklist: ChecklistItem[];
  work_mode: WorkMode;
  metadata: TaskMetadata;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  tags?: string[];
  checklist?: ChecklistItem[];
  work_mode?: WorkMode;
  metadata?: TaskMetadata;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  completed_at?: string | null;
}

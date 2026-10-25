export type TaskStatus = 'backlog' | 'in_progress' | 'ready_for_test' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';
export type QaResult = 'pending' | 'approved' | 'rejected';

export interface QaChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  qa_checklist: QaChecklistItem[];
  qa_result: QaResult;
  qa_notes: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Optional legacy fields for backward compatibility during migration
  project_name?: string;
  tags?: string[];
  checklist?: any[];
  work_mode?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskDto {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  qa_checklist?: QaChecklistItem[];
  qa_result?: QaResult;
  qa_notes?: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  completed_at?: string | null;
}

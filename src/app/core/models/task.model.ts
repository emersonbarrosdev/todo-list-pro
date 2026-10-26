export type TaskStatus = 'backlog' | 'in_progress' | 'doing' | 'qa' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';
export type QaResult = 'not_started' | 'pending' | 'approved' | 'rejected';

export interface QaChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  project: string; // Nome / etiqueta do projeto (ex: Fundacion, Prouser, Meu site)
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  qa_checklist: QaChecklistItem[];
  qa_result: QaResult;
  qa_notes: string; // Motivo obrigatório em reprovação/pendência ou observação
  images: string[]; // Lista de imagens (miniaturas com lightbox)
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Campos de compatibilidade legada
  project_id?: string;
  tags?: string[];
  checklist?: any[];
  work_mode?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskDto {
  title: string;
  project?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  qa_checklist?: QaChecklistItem[];
  qa_result?: QaResult;
  qa_notes?: string;
  images?: string[];
  project_id?: string;
}

export interface UpdateTaskDto extends Partial<CreateTaskDto> {
  completed_at?: string | null;
}

export const PROJECT_PALETTE: readonly string[] = [
  '#A78BFA', // Violet
  '#38BDF8', // Sky Blue
  '#34D399', // Emerald
  '#FBBF24', // Amber
  '#F472B6', // Pink
  '#818CF8', // Indigo
  '#FB923C', // Orange
  '#2DD4BF', // Teal
  '#E879F9', // Fuchsia
  '#60A5FA', // Blue
  '#4ADE80', // Green
];

export function getProjectColor(project?: string | null): string {
  const name = (project || '').trim();
  if (!name) return '#94A3B8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROJECT_PALETTE.length;
  return PROJECT_PALETTE[index];
}

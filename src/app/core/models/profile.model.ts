export type WorkMode = 'general' | 'dev' | 'qa';

export interface Profile {
  id: string;
  display_name: string;
  work_mode: WorkMode;
  created_at?: string;
  updated_at?: string;
}

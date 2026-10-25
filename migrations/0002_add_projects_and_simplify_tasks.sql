-- =====================================================================
-- TODO PRO - Cloudflare D1 Database Schema
-- Migration: 0002_add_projects_and_simplify_tasks.sql
-- =====================================================================

-- 1. Ensure projects table exists
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_archived ON projects(user_id, archived);

-- 2. Ensure base tasks table exists before migrating so fresh databases won't fail
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_at TEXT,
  completed_at TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  checklist TEXT NOT NULL DEFAULT '[]',
  work_mode TEXT NOT NULL DEFAULT 'general',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

-- 3. Seed default project for any existing users with tasks
INSERT OR IGNORE INTO projects (id, user_id, name, description, archived, created_at, updated_at)
SELECT
  'proj_default_' || user_id,
  user_id,
  'Meu Projeto',
  'Projeto inicial criado automaticamente',
  0,
  datetime('now'),
  datetime('now')
FROM tasks
WHERE user_id IS NOT NULL AND user_id != ''
GROUP BY user_id;

-- 4. Create tasks_new with project_id and QA fields, plus new status CHECK constraint
CREATE TABLE IF NOT EXISTS tasks_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'ready_for_test', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  due_at TEXT,
  qa_checklist TEXT NOT NULL DEFAULT '[]',
  qa_result TEXT NOT NULL DEFAULT 'pending' CHECK (qa_result IN ('pending', 'approved', 'rejected')),
  qa_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  checklist TEXT NOT NULL DEFAULT '[]',
  work_mode TEXT NOT NULL DEFAULT 'general',
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- 5. Copy existing tasks to tasks_new mapping legacy status and assigning to default project
INSERT INTO tasks_new (
  id,
  project_id,
  user_id,
  title,
  description,
  status,
  priority,
  due_at,
  qa_checklist,
  qa_result,
  qa_notes,
  created_at,
  updated_at,
  completed_at,
  tags,
  checklist,
  work_mode,
  metadata
)
SELECT
  id,
  'proj_default_' || user_id,
  user_id,
  title,
  description,
  CASE
    WHEN status = 'todo' THEN 'backlog'
    WHEN status = 'doing' THEN 'in_progress'
    WHEN status = 'ready_for_test' THEN 'ready_for_test'
    WHEN status = 'done' THEN 'done'
    ELSE 'backlog'
  END AS status,
  priority,
  due_at,
  checklist AS qa_checklist,
  'pending' AS qa_result,
  '' AS qa_notes,
  created_at,
  updated_at,
  completed_at,
  tags,
  checklist,
  work_mode,
  metadata
FROM tasks;

-- 6. Drop old tasks table and rename tasks_new
DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

-- 7. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON tasks(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_at);

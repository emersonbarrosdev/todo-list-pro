import { AppEnvironment } from './environment';

const runtimeEnv = (typeof window !== 'undefined' && window.__TODO_PRO_ENV__) || {};

export const environment: AppEnvironment = {
  production: false,
  supabaseUrl: runtimeEnv.SUPABASE_URL || 'https://placeholder-todo-pro.supabase.co',
  supabaseKey: runtimeEnv.SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key',
  turnstileSiteKey: runtimeEnv.TURNSTILE_SITE_KEY || '',
};

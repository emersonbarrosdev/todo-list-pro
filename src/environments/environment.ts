export interface AppEnvironment {
  production: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  turnstileSiteKey?: string;
}

// Window runtime env extension if injected at deploy time
declare global {
  interface Window {
    __TODO_PRO_ENV__?: {
      SUPABASE_URL?: string;
      SUPABASE_PUBLISHABLE_KEY?: string;
      TURNSTILE_SITE_KEY?: string;
    };
  }
}

const runtimeEnv = (typeof window !== 'undefined' && window.__TODO_PRO_ENV__) || {};

export const environment: AppEnvironment = {
  production: true,
  supabaseUrl: runtimeEnv.SUPABASE_URL || 'https://placeholder-todo-pro.supabase.co',
  supabaseKey: runtimeEnv.SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key',
  turnstileSiteKey: runtimeEnv.TURNSTILE_SITE_KEY || '',
};

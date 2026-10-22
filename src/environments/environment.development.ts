import { AppEnvironment } from './environment';

const runtimeEnv = (typeof window !== 'undefined' && window.__TODO_PRO_ENV__) || {};

export const environment: AppEnvironment = {
  production: false,
  supabaseUrl: runtimeEnv.SUPABASE_URL || 'https://vgdiazxzkxjdtnwxatpq.supabase.co',
  supabaseKey: runtimeEnv.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wckQLn3YtX20gy2syTRXnw_eeGsETvd',
  turnstileSiteKey: runtimeEnv.TURNSTILE_SITE_KEY || '',
};

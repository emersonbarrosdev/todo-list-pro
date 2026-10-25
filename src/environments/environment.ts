export interface AppEnvironment {
  production: boolean;
  clerkPublishableKey: string;
  apiUrl: string;
  turnstileSiteKey?: string;
}

declare const process: any;

// Window runtime env extension if injected at deploy time
declare global {
  interface Window {
    __TODO_PRO_ENV__?: {
      CLERK_PUBLISHABLE_KEY?: string;
      API_URL?: string;
      PRODUCTION?: string;
    };
  }
}

const runtimeEnv = (typeof window !== 'undefined' && window.__TODO_PRO_ENV__) || {};

const isTestEnv =
  (typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || process.env?.VITEST === 'true')) ||
  runtimeEnv.PRODUCTION === 'false';

export const environment: AppEnvironment = {
  production: isTestEnv ? false : true,
  clerkPublishableKey:
    runtimeEnv.CLERK_PUBLISHABLE_KEY ||
    'pk_test_ZXhwZXJ0LXdvbWJhdC01OTM4LmNsZXJrLmFjY291bnRzLmRldiQ',
  apiUrl: runtimeEnv.API_URL || '/api',
};

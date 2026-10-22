export interface AppEnvironment {
  production: boolean;
  clerkPublishableKey: string;
  apiUrl: string;
  turnstileSiteKey?: string;
}

// Window runtime env extension if injected at deploy time
declare global {
  interface Window {
    __TODO_PRO_ENV__?: {
      CLERK_PUBLISHABLE_KEY?: string;
      API_URL?: string;
    };
  }
}

const runtimeEnv = (typeof window !== 'undefined' && window.__TODO_PRO_ENV__) || {};

export const environment: AppEnvironment = {
  production: true,
  clerkPublishableKey: runtimeEnv.CLERK_PUBLISHABLE_KEY || 'pk_test_ZXhwZXJ0LXdvbWJhdC01OTM4LmNsZXJrLmFjY291bnRzLmRldiQ',
  apiUrl: runtimeEnv.API_URL || '/api',
};

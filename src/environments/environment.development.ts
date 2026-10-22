import { AppEnvironment } from './environment';

const runtimeEnv = (typeof window !== 'undefined' && window.__TODO_PRO_ENV__) || {};

export const environment: AppEnvironment = {
  production: false,
  clerkPublishableKey: runtimeEnv.CLERK_PUBLISHABLE_KEY || 'pk_test_ZXhwZXJ0LXdvbWJhdC01OTM4LmNsZXJrLmFjY291bnRzLmRldiQ',
  apiUrl: runtimeEnv.API_URL || '/api',
};

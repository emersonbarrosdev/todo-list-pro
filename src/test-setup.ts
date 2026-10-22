import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

(window as unknown as { __TODO_PRO_ENV__: Record<string, string> }).__TODO_PRO_ENV__ = {
  CLERK_PUBLISHABLE_KEY: 'placeholder-clerk-test-key',
  API_URL: '/api',
};

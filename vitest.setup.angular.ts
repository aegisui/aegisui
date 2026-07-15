import '@testing-library/jest-dom/vitest';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

/**
 * Inicializa el entorno de TestBed una vez por worker. Zoneless (SPEC §ADR-005):
 * no se importa `zone.js`. La detección de cambios sin zona la aportan los tests
 * (o `@testing-library/angular`) vía `provideZonelessChangeDetection()`.
 */
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

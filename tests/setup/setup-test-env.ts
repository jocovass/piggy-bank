import 'dotenv/config';

import { installGlobals } from '@remix-run/node';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi, type MockInstance } from 'vitest';

installGlobals();

afterEach(() => cleanup());

type ConsoleErrorParams = Parameters<typeof console.error>;
export let consoleError: MockInstance<ConsoleErrorParams>;
beforeEach(() => {
	const originalConsoleError = console.error;
	consoleError = vi.spyOn(console, 'error');
	consoleError.mockImplementation((...args: ConsoleErrorParams) => {
		originalConsoleError(...args);
		throw new Error(
			`Console error was called. Call consoleError.mockImplementation(() => {}) if this is expected.`,
		);
	});
});

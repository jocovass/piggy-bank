import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import { flatRoutes } from 'remix-flat-routes';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

installGlobals();

export default defineConfig({
	server: {
		port: 3000,
		cors: {},
	},
	plugins: [
		tsconfigPaths(),
		remix({
			ignoredRouteFiles: ['**/*'],
			serverModuleFormat: 'esm',
			routes: async defineRoutes => {
				return flatRoutes('routes', defineRoutes, {
					ignoredRouteFiles: [
						'.*',
						'**/*.css',
						'**/*.test.{js,jsx,ts,tsx}',
						'**/__*.*',
						'**/*.server.*',
						'**/*.client.*',
					],
				});
			},
		}),
	],
});

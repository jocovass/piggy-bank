import { z } from 'zod';

const schema = z.object({
	DB_URL: z.string(),
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	VERIFICATION_SESSION_SECRET: z.string(),
});

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
	return {
		MODE: process.env.NODE_ENV,
	};
}

type ENV = ReturnType<typeof getEnv>;
declare global {
	var ENV: ENV;
	interface Window {
		ENV: ENV;
	}
}

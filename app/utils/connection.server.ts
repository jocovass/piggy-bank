import { createCookieSessionStorage } from '@remix-run/node';
import { type ProviderName } from '~/app/routes/_auth+/auth.$provider';
import { GithubProvider } from './providers/github.server';
import { type AuthProvider } from './providers/providers';

export const connectionSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pg_connection',
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 10 * 60,
		secrets: process.env.CONNECTION_SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
});

export const providers: Record<ProviderName, AuthProvider> = {
	github: new GithubProvider(),
} as const;

export const resolveConnectionData = async (
	providerId: string,
	providerName: ProviderName,
) => {
	const provider = providers[providerName];
	if (!provider) {
		throw new Error(`Unknown provider ${providerName}`);
	}

	return await provider.resolveConnectionData(providerId);
};

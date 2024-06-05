import { type Strategy } from 'remix-auth';

export type ProviderUser = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	avatarUrl?: string;
};

export interface AuthProvider {
	getAuthStrategy(): Strategy<ProviderUser, any>;
	resolveConnectionData(
		providerId: string,
	): Promise<{ displayName: string; link?: string | null }>;
}

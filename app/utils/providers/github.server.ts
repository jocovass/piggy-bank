import { GitHubStrategy } from 'remix-auth-github';
import { z } from 'zod';
import { type AuthProvider, type ProviderUser } from './providers';

const GithubUserschema = z.object({ login: z.string() });

export class GithubProvider implements AuthProvider {
	getAuthStrategy() {
		return new GitHubStrategy(
			{
				clientID: process.env.GITHUB_CLIENT_ID,
				clientSecret: process.env.GITHUB_CLIENT_SECRET,
				callbackURL: '/auth/github/callback',
			},
			async ({ profile }) => {
				const user: ProviderUser = {
					id: profile.id,
					email: profile.emails[0].value,
					firstName: profile.name.givenName.split(' ')[0],
					lastName: profile.name.givenName.split(' ')[1],
				};

				if (profile.photos[0]?.value) {
					const response = await fetch(profile.photos[0].value);
					const blob = await response.blob();
					const fileType = response.headers.get('Content-Type');
					user.image = {
						blob: Buffer.from(await blob.arrayBuffer()),
						file_type: fileType || '',
						name: `github-avatar.${fileType?.split('/')[1]}`,
						size: blob.size,
					};
				}

				return user;
			},
		);
	}

	async resolveConnectionData(providerId: string) {
		const response = await fetch(`https://api.github.com/users/${providerId}`, {
			headers: {
				Authorization: `token ${process.env.GITHUB_TOKEN}`,
			},
		});
		const rawJson = await response.json();
		const result = GithubUserschema.safeParse(rawJson);
		return {
			displayName: result.success ? result.data.login : 'Unknown',
			link: result.success ? `https://github.com/${result.data.login}` : null,
		} as const;
	}
}

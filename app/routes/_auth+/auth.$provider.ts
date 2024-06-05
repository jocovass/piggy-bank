import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { z } from 'zod';
import { authenticator } from '~/app/utils/auth.server';
import { getReferrerRoute } from '~/app/utils/misc';
import { getRedirectCookieHeader } from '~/app/utils/redirect-cookie.server';

export const GITHUB_PROVIDER_NAME = 'github';
export const providerNames = [GITHUB_PROVIDER_NAME] as const;

export const ProviderNameSchema = z.enum(providerNames);
export type ProviderName = z.infer<typeof ProviderNameSchema>;
export const providerLabels: Record<ProviderName, string> = {
	[GITHUB_PROVIDER_NAME]: 'Github',
} as const;

export async function loader() {
	return redirect('/login');
}

export async function action({ request, params }: ActionFunctionArgs) {
	const provider = ProviderNameSchema.parse(params.provider);
	try {
		await authenticator.authenticate(provider, request);
	} catch (error) {
		if (error instanceof Response) {
			const formData = await request.formData();
			const rawRedirectTo = formData.get('redirectTo');
			const redirectTo =
				typeof rawRedirectTo === 'string'
					? rawRedirectTo
					: getReferrerRoute(request);

			const redirectCookieHeader = getRedirectCookieHeader(redirectTo);
			if (redirectCookieHeader) {
				error.headers.append('Set-Cookie', redirectCookieHeader);
			}
		}
		throw error;
	}
}

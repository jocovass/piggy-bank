import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { NavLink } from '@remix-run/react';
import { useState } from 'react';
import LaunchLink from '~/app/components/launch-link';
import { Button } from '~/app/components/ui/button';
import { requireUser } from '~/app/utils/auth.server';

export const plaidOauthConfigKey = 'plaidOauthConfig';

export async function loader({ request }: LoaderFunctionArgs) {
	requireUser(request);
	return json({});
}

/**
 * Route rendered when a user is redirected back to site from OAuth institution stie.
 * It initiates the link immediatedly with the original link token that was set in local storage from the inital link initiatialization.
 */
export default function PlaidOauth() {
	const [oAuthConfig] = useState(() => {
		const parsedConfig = JSON.parse(
			localStorage.getItem(plaidOauthConfigKey) || '',
		);

		const oAuthConfig: {
			itemId?: string;
			token?: string;
			userId?: string;
		} = {};

		if (
			parsedConfig &&
			parsedConfig !== null &&
			typeof parsedConfig === 'object'
		) {
			if ('itemId' in parsedConfig && typeof parsedConfig.itemId === 'string') {
				oAuthConfig.itemId = parsedConfig.itemId;
			}

			if ('token' in parsedConfig && typeof parsedConfig.token === 'string') {
				oAuthConfig.itemId = parsedConfig.token;
			}

			if ('userId' in parsedConfig && typeof parsedConfig.userId === 'string') {
				oAuthConfig.itemId = parsedConfig.userId;
			}
		}

		return oAuthConfig;
	});

	if (!oAuthConfig.token || !oAuthConfig.userId) {
		return (
			<>
				<h1>Can't complete OAuth flow because link token is misssing</h1>
				<Button asChild variant="secondary">
					<NavLink to="/dashboard">Go to dashboard</NavLink>
				</Button>
			</>
		);
	}

	return (
		<>
			<LaunchLink
				isOauth
				itemId={oAuthConfig.itemId}
				link={oAuthConfig.token}
				userId={oAuthConfig.userId}
			/>
		</>
	);
}

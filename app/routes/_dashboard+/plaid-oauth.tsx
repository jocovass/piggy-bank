import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { NavLink } from '@remix-run/react';
import { useEffect, useState } from 'react';
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
 * It initiates the link immediatedly with the original link token that was set
 * in local storage from the inital link initiatialization.
 */
export default function PlaidOauth() {
	const [link, setLink] = useState<string | undefined>();
	const [itemId, setItemId] = useState<string | undefined>();
	const [userId, setUserId] = useState<string | undefined>();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const oAuthConfig = JSON.parse(
				localStorage.getItem(plaidOauthConfigKey) || '',
			) as {
				itemId?: string;
				link?: string;
				userId?: string;
			};

			setUserId(oAuthConfig.userId);
			setItemId(oAuthConfig.itemId);
			setLink(oAuthConfig.link);
			setLoading(false);
		}
	}, []);

	if (loading) {
		return <p>Loading...</p>;
	}

	if (!link || !userId) {
		return (
			<>
				<h1>Can't complete OAuth flow because link token is misssing</h1>
				<Button asChild variant="secondary">
					<NavLink to="/">Go to dashboard</NavLink>
				</Button>
			</>
		);
	}

	return (
		<>
			<LaunchLink isOauth itemId={itemId} link={link} userId={userId} />
		</>
	);
}

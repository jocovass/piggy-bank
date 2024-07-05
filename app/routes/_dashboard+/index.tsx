import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import LaunchLink from '~/app/components/launch-link';
import { Button } from '~/app/components/ui/button';
import { type action } from '~/app/routes/_resources+/generate-link-token';
import { useUser } from '~/app/utils/user';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	return json({});
}

export default function Dashboard() {
	const getPublicLink = useFetcher<typeof action>();
	const user = useUser();
	const linkToken =
		getPublicLink.data?.status === 'success'
			? getPublicLink?.data?.data.link_token
			: null;
	const error =
		getPublicLink.data?.status === 'error' ? getPublicLink?.data?.errors : null;

	return (
		<div>
			<p>
				Welcome to your new dashboard! Connect a bank account to get started.
			</p>
			<getPublicLink.Form method="POST" action="/generate-link-token">
				<Button type="submit">Connect account</Button>
			</getPublicLink.Form>
			{error && <p>{error.displayMessage}</p>}

			{linkToken && <LaunchLink link={linkToken} userId={user.id} />}
		</div>
	);
}

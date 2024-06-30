import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import LaunchLink from '~/app/components/launch-link';
import { Button } from '~/app/components/ui/button';
import { type action } from '~/app/routes/_resources+/generate-link-token';

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
	const getLink = useFetcher<typeof action>();

	console.log(getLink?.data);
	return (
		<div>
			<p>
				Welcome to your new dashboard! Connect a bank account to get started.
			</p>
			<getLink.Form method="POST" action="/generate-link-token">
				<Button type="submit">Connect account</Button>
			</getLink.Form>

			{getLink.data?.data.link_token && (
				<LaunchLink
					link={getLink.data.data.link_token}
					userId={getLink.data.data.userId}
				/>
			)}
		</div>
	);
}

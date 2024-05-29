import { type MetaFunction } from '@remix-run/node';
import { Form, NavLink, useRouteLoaderData } from '@remix-run/react';
import { Button } from '~/app/components/ui/button';
import { type loader as rootLoader } from '~/app/root';
import { useToast } from '~/app/utils/toaster';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export default function Index() {
	const rootData = useRouteLoaderData<typeof rootLoader>('root');
	useToast(rootData?.toast);

	return (
		<div className="p-5">
			{rootData?.user ? (
				<div className="mb-6">
					Hello: {rootData.user.firstName} {rootData.user.lastName}
				</div>
			) : null}

			{rootData?.user ? (
				<Form method="POST" action="/logout">
					<Button type="submit">Logout</Button>
				</Form>
			) : (
				<div className="flex items-center gap-5">
					<Button asChild>
						<NavLink to="/login">Login</NavLink>
					</Button>
					<Button asChild>
						<NavLink to="/signup">Signup</NavLink>
					</Button>
				</div>
			)}
		</div>
	);
}

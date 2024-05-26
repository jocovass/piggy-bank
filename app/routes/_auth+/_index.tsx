import { type MetaFunction } from '@remix-run/node';
import { NavLink, useRouteLoaderData } from '@remix-run/react';
import { type loader as rootLoader } from '~/app/root';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export default function Index() {
	const rootData = useRouteLoaderData<typeof rootLoader>('root');

	return (
		<div className="flex items-center gap-5">
			<NavLink to="/login">Login</NavLink>
			<NavLink to="/signup">Signup</NavLink>

			{rootData?.user ? (
				<div>
					Hello: {rootData.user.firstName} {rootData.user.lastName}
				</div>
			) : null}
		</div>
	);
}

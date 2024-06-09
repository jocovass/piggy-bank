import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { NavLink, Outlet, useLoaderData } from '@remix-run/react';
import { requireUser } from '~/app/utils/auth.server';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	return json({ user: user });
}

export default function Index() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="flex">
			<div className="h-screen border-r p-3">
				<p>Side Nav</p>
				<h2 className="text-bold mb-4 text-2xl">
					{data.user.firstName} {data.user.lastName}
				</h2>

				<nav className="flex flex-col">
					<NavLink to="/">Dashboard</NavLink>
					<NavLink to="/settings/profile">Settings</NavLink>
				</nav>
			</div>

			<div className="h-screen px-4 py-2">
				<Outlet />
			</div>
		</div>
	);
}

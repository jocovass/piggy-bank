import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { Form, NavLink, Outlet, useLoaderData } from '@remix-run/react';
import { and, eq } from 'drizzle-orm';
import { Button } from '~/app/components/ui/button';
import { requireUser } from '~/app/utils/auth.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const twoFactorVerification = await db.query.verifications.findFirst({
		where: and(
			eq(verifications.target, user.id),
			eq(verifications.type, '2fa'),
		),
	});

	return json({ isTwoFactorEnabled: !!twoFactorVerification });
}

export default function SettingsLayout() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<div>
				<p>SETTINGS LAYOUT</p>
				<nav className="flex flex-col">
					<NavLink to="profile">Profile</NavLink>
					<NavLink to="email">Change email</NavLink>
					<NavLink to="password">Change password</NavLink>
					<NavLink to="two-factor">
						{data.isTwoFactorEnabled ? 'Disable' : 'Enable'} two factor auth
					</NavLink>
					<Form method="POST" action="/logout">
						<Button variant="link" type="submit">
							Logout
						</Button>
					</Form>
				</nav>
			</div>

			<div className="h-screen p-2">
				<Outlet />
			</div>
		</div>
	);
}

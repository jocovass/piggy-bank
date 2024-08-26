import { Form, NavLink, Outlet } from '@remix-run/react';
import { Button } from '~/app/components/ui/button';

export default function SettingsLayout() {
	return (
		<div>
			<div>
				<p>Settings</p>
				<nav className="flex flex-col">
					<NavLink to="profile">Profile</NavLink>
					<NavLink to="email">Change email</NavLink>
					<NavLink to="password">Change password</NavLink>
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

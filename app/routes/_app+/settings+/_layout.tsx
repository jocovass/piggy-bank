import { Outlet } from '@remix-run/react';
import NavItem from '~/app/components/nav-item';

export default function SettingsLayout() {
	return (
		<div className="max-w-2xl px-2">
			<div className="mb-10">
				<h2 className="mb-4 text-2xl font-bold">Settings</h2>
				<nav className="flex items-center gap-x-2">
					<NavItem to="profile" className="px-7 py-1">
						Profile
					</NavItem>
					<NavItem to="email" className="px-7 py-1">
						Change email
					</NavItem>
					<NavItem to="password" className="px-7 py-1">
						Change password
					</NavItem>
				</nav>
			</div>

			<Outlet />
		</div>
	);
}

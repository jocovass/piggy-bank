import { NavLink } from '@remix-run/react';

export default function Password() {
	return (
		<div>
			<h1>Passwords</h1>
			<NavLink to="/settings/two-factor-auth">
				Two factor authentication
			</NavLink>
		</div>
	);
}

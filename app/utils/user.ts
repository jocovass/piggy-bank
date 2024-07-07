import { type SerializeFrom } from '@remix-run/node';
import { useRouteLoaderData } from '@remix-run/react';
import { type loader } from '~/app/root';

function isUser(user: any): user is SerializeFrom<typeof loader>['user'] {
	return user && typeof user?.id === 'string';
}

export function useOptionalUser() {
	const data = useRouteLoaderData<typeof loader>('root');
	if (!data || !isUser(data.user)) {
		return null;
	}
	return data.user;
}

export function useUser() {
	const optionalUser = useOptionalUser();
	if (!optionalUser) {
		throw new Error(
			'No user found but it is required by "useUser". If user is optional try using "useOptionalUser"',
		);
	}
	return optionalUser;
}

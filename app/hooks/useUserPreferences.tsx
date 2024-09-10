import { useRouteLoaderData } from '@remix-run/react';
import invariant from 'tiny-invariant';
import { type loader } from '~/app/root';

export function useUserPreferences() {
	const data = useRouteLoaderData<typeof loader>('root');
	invariant(data?.userPreferences, 'User preferences should be available');

	return data.userPreferences;
}

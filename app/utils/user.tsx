import { useRouteLoaderData } from '@remix-run/react';
import { type loader } from '~/app/root';

export function useHints() {
	const data = useRouteLoaderData<typeof loader>('root');
	return data?.hints;
}

import { getHintUtils } from '@epic-web/client-hints';
import {
	clientHint as colorHint,
	subscribeToSchemeChange,
} from '@epic-web/client-hints/color-scheme';
import { clientHint as reducedMotionHint } from '@epic-web/client-hints/reduced-motion';
import { clientHint as timeZoneHint } from '@epic-web/client-hints/time-zone';
import { useRevalidator, useRouteLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import invariant from 'tiny-invariant';
import { type loader } from '~/app/root';

const hintUtils = getHintUtils({
	theme: colorHint,
	reducedMotion: reducedMotionHint,
	timeZone: timeZoneHint,
});

export const { getHints } = hintUtils;

export function useHints() {
	const data = useRouteLoaderData<typeof loader>('root');
	invariant(data?.hints, 'Hints should be available');
	return data.hints;
}

export function ClientHintCheck() {
	const { revalidate } = useRevalidator();
	useEffect(() => {
		const unsubscribe = subscribeToSchemeChange(() => revalidate());
		return unsubscribe;
	}, [revalidate]);

	return (
		<script
			dangerouslySetInnerHTML={{
				__html: hintUtils.getClientHintCheckScript(),
			}}
		/>
	);
}

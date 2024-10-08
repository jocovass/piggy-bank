import { useFormAction, useNavigation } from '@remix-run/react';
import { type ClassValue, clsx } from 'clsx';
import { useSpinDelay } from 'spin-delay';
import { twMerge } from 'tailwind-merge';

export function useIsPending({
	formAction,
	formMethod = 'POST',
	state = 'non-idle',
}: {
	formAction?: string;
	formMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	state?: 'submitting' | 'non-idle' | 'loading';
} = {}) {
	const contextualFormAction = useFormAction();
	const navigation = useNavigation();
	const isPending =
		state === 'non-idle'
			? navigation.state !== 'idle'
			: navigation.state === state;
	return (
		isPending &&
		navigation.formAction === (formAction ?? contextualFormAction) &&
		navigation.formMethod === formMethod
	);
}

export function useDelayedIsPending({
	formAction,
	formMethod,
	delay = 400,
	minDuration = 300,
}: Parameters<typeof useIsPending>[0] &
	Parameters<typeof useSpinDelay>[1] = {}) {
	const isPending = useIsPending({
		formAction,
		formMethod,
	});
	return useSpinDelay(isPending, { delay, minDuration });
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getDomainUrl(request: Request) {
	const host =
		request.headers.get('X-Forwarded-Host') ||
		request.headers.get('host') ||
		new URL(request.url).host;
	const protocol = request.headers.get('X-Forwarded-Proto') || 'http';
	return `${protocol}://${host}`;
}

export function getReferrerRoute(request: Request) {
	const referrer =
		request.headers.get('referer') ??
		request.headers.get('referrer') ??
		request.referrer;
	const domain = getDomainUrl(request);
	if (referrer?.startsWith(domain)) {
		return referrer.slice(domain.length);
	}
	return '/';
}

export function combineHeaders(
	...headers: (ResponseInit['headers'] | undefined | null)[]
) {
	const mergedHeaders = new Headers();
	for (const header of headers) {
		if (!header) continue;
		for (const [key, value] of new Headers(header).entries()) {
			mergedHeaders.append(key, value);
		}
	}
	return mergedHeaders;
}

export function combineResponseInit(
	...inits: Array<ResponseInit | null | undefined>
) {
	let combinedInit: ResponseInit = {};
	for (const val of inits) {
		combinedInit = {
			...val,
			headers: combineHeaders(val?.headers, combinedInit.headers),
		};
	}

	return combinedInit;
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getOriginUrl(request: Request) {
	const host =
		request.headers.get('X-Forwarded-Host') ||
		request.headers.get('host') ||
		new URL(request.url).host;
	const protocol = host.includes('localhost') ? 'http://' : 'https://';
	return protocol + host;
}

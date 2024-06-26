import { createId as cuid2 } from '@paralleldrive/cuid2';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { z } from 'zod';

export const toastSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'pg_toast',
		path: '/',
		sameSite: 'lax',
		httpOnly: true,
		secrets: process.env.TOAST_SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
	},
});

export const toastSessionKey = 'pg_toast_key';

export const ServerToastSchema = z.object({
	description: z.string().optional(),
	id: z
		.string()
		.optional()
		.default(() => cuid2()),
	title: z.string(),
	type: z.enum(['message', 'error', 'success']).default('message'),
});

export type ServerToast = z.infer<typeof ServerToastSchema>;
export type ServerToastInput = z.input<typeof ServerToastSchema>;

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

export async function redirectWithToast(
	url: string,
	toastInput: ServerToastInput,
	init?: ResponseInit,
) {
	const toastHeader = await createToastHeader(toastInput);
	return redirect(url, {
		...init,
		headers: combineHeaders(init?.headers, toastHeader),
	});
}

export async function createToastHeader(toastInput: ServerToastInput) {
	const toastSession = await toastSessionStorage.getSession();
	const parsedData = await ServerToastSchema.safeParseAsync(toastInput);
	if (parsedData.success) {
		toastSession.flash(toastSessionKey, parsedData.data);
	}
	const header = new Headers();
	header.append(
		'Set-Cookie',
		await toastSessionStorage.commitSession(toastSession),
	);
	return header;
}

export async function getToastFromRequest(request: Request) {
	const toastSession = await toastSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const result = await ServerToastSchema.safeParseAsync(
		toastSession.get(toastSessionKey),
	);
	const toastInput = result.success ? result.data : null;
	return {
		toast: toastInput,
		toastHeader: toastInput
			? await toastSessionStorage.commitSession(toastSession)
			: null,
	};
}

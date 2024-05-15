import { renderAsync } from '@react-email/components';
import { type ReactElement } from 'react';
import { z } from 'zod';

export const resendErrorSchema = z.union([
	z.object({
		name: z.string(),
		message: z.string(),
		statusCode: z.number(),
	}),
	z.object({
		name: z.literal('UnknownError'),
		message: z.literal('UnknownError'),
		statusCode: z.literal(500),
		cause: z.any(),
	}),
]);

export type ResendError = z.infer<typeof resendErrorSchema>;

export const resendSuccessSchema = z.object({
	id: z.string(),
});

/**
 * Sends an email using Resend API.
 */
export async function sendEmail({
	react,
	...options
}: {
	to: string;
	subject: string;
} & (
	| { html: string; text: string; react?: never }
	| { react: ReactElement; html?: never; text?: never }
)) {
	const from = 'hello@piggybank.dev';

	const email = {
		from,
		...options,
		...(react ? await renderReactEmail(react) : null),
	};

	if (process.env.NODE_ENV === 'development' || process.env.MOCK) {
		console.log('We are not sending actuall emails during development 📩');
		console.log('Signup email template: ', JSON.stringify(email.html));
		return {
			status: 'success',
			data: { id: 'mocked' },
		} as const;
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
			'Content-Type': 'aplication/json',
		},
		body: JSON.stringify(email),
	});
	const data = await response.json();
	const parsedData = resendSuccessSchema.safeParse(data);

	if (response.ok && parsedData.success) {
		return {
			status: 'success',
			data: { id: parsedData.data.id },
		} as const;
	} else {
		const parsedError = resendErrorSchema.safeParse(data);
		if (parsedError.success) {
			return {
				status: 'error',
				error: parsedError.data,
			} as const;
		} else {
			return {
				status: 'error',
				error: {
					name: 'UnknownError',
					message: 'UnknownError',
					statusCode: 500,
					cause: data,
				} satisfies ResendError,
			} as const;
		}
	}
}

/**
 * Renders a react email template in HTML format as well as the plain text
 * representation.
 */
export async function renderReactEmail(react: ReactElement) {
	const [html, text] = await Promise.all([
		renderAsync(react),
		renderAsync(react, { plainText: true }),
	]);

	return { html, text };
}

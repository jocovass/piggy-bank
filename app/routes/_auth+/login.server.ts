import { UTCDate } from '@date-fns/utc';
import { redirect } from '@remix-run/node';
import { and, eq } from 'drizzle-orm';
import { safeRedirect } from 'remix-utils/safe-redirect';
import invariant from 'tiny-invariant';
import {
	twoFactorAuthType,
	unverifiedsessionIdKey,
	verifiedTimeKey,
} from '~/app/routes/_app+/settings+/two-factor-auth';
import { sessionKey } from '~/app/utils/auth.server';
import { combineResponseInit } from '~/app/utils/misc';
import { authSessionStorage } from '~/app/utils/session.server';
import { redirectWithToast } from '~/app/utils/toast.server';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { sessions, verifications, type Session } from '~/db/schema';
import { type VerifyFunctionArgs, generateRedirectUrl } from './verify.server';

export const rememberMeKey = 'remember';

export async function handleNewSession(
	{
		redirectTo = '/dashboard',
		remember = false,
		request,
		session,
	}: {
		redirectTo?: string;
		remember?: boolean;
		request: Request;
		session: Session;
	},
	responseInit?: ResponseInit,
) {
	const userTwoFA = await db.query.verifications.findFirst({
		where: and(
			eq(verifications.target, session.userId),
			eq(verifications.type, twoFactorAuthType),
		),
	});

	if (userTwoFA) {
		const verifySession = await verifySessionStorage.getSession(
			request.headers.get('Cookie'),
		);
		verifySession.set(rememberMeKey, remember);
		verifySession.set(unverifiedsessionIdKey, session.id);

		const url = generateRedirectUrl({
			request,
			redirectUrl: redirectTo,
			type: '2fa',
			target: session.userId,
		});

		throw redirect(
			url.toString(),
			combineResponseInit(
				{
					headers: {
						'Set-Cookie':
							await verifySessionStorage.commitSession(verifySession),
					},
				},
				responseInit,
			),
		);
	} else {
		const authSession = await authSessionStorage.getSession(
			request.headers.get('Cookie'),
		);
		authSession.set(sessionKey, session.id);

		throw redirect(
			'/dashboard',
			combineResponseInit(
				{
					headers: {
						'Set-Cookie': await authSessionStorage.commitSession(authSession, {
							expires: remember ? session.expirationDate : undefined,
						}),
					},
				},
				responseInit,
			),
		);
	}
}

export async function handleTwoFAVerification({
	request,
	submission,
}: VerifyFunctionArgs) {
	invariant(
		submission.status === 'success',
		'Submission should be successful by now',
	);

	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('cookie'),
	);

	authSession.set(verifiedTimeKey, UTCDate.now());
	const unverifiedSessionId = verifySession.get(unverifiedsessionIdKey);
	const session = await db.query.sessions.findFirst({
		columns: { id: true, expirationDate: true },
		where: eq(sessions.id, unverifiedSessionId),
	});

	const headers = new Headers();
	/**
	 * If session does not exist, destroy set-cookie headers and redirect to login page.
	 */
	if (!session) {
		headers.append(
			'Set-Cookie',
			await verifySessionStorage.destroySession(verifySession),
		);
		headers.append(
			'Set-Cookie',
			await authSessionStorage.destroySession(authSession),
		);
		throw await redirectWithToast(
			'/login',
			{
				title: 'Invalid session',
				description: 'Could not find session to verify. Please try again.',
				type: 'error',
			},
			{ headers },
		);
	}

	authSession.set(sessionKey, session.id);
	const { redirectTo } = submission.value;
	const remember = verifySession.get(rememberMeKey);

	headers.append(
		'Set-Cookie',
		await authSessionStorage.commitSession(authSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	);

	headers.append(
		'Set-Cookie',
		await verifySessionStorage.destroySession(verifySession),
	);

	return redirect(safeRedirect(redirectTo), { headers });
}

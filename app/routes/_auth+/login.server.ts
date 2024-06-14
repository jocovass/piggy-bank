import { and, eq } from 'drizzle-orm';
import { twoFactorAuthType } from '~/app/routes/_dashboard+/settings+/two-factor-auth';
import { requireUser } from '~/app/utils/auth.server';
import { authSessionStorage } from '~/app/utils/session.server';
import { verifySessionStorage } from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { type User, verifications, type Session } from '~/db/schema';

export const verifiedTimeKey = 'verified-time';
export const unverifiedsessionidkey = 'unverified-session-id';
export const rememberMeKey = 'remember-me';

export function handleNewSession({
	remember = false,
	request,
	session,
}: {
	remember?: boolean;
	request: Request;
	session: Session;
}) {}

export async function shouldRequestTwoFA(request: Request, user?: User) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	);

	if (verifySession.has(unverifiedsessionidkey)) return true;
	const _user = user ?? (await requireUser(request));
	if (!_user) return false;

	const twoFacotorEnabled = await db.query.verifications.findFirst({
		where: and(
			eq(verifications.target, _user.id),
			eq(verifications.type, twoFactorAuthType),
		),
	});

	if (!twoFacotorEnabled) return false;
	const verifiedTime = authSession.get(verifiedTimeKey) ?? new Date(0);
	const twoHours = 1000 * 60 * 2;
	return Date.now() - verifiedTime > twoHours;
}

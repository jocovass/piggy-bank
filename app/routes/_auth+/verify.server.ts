import { type Submission } from '@conform-to/react';
import { UTCDate } from '@date-fns/utc';
import { generateTOTP, verifyTOTP } from '@epic-web/totp';
import { and, eq, or } from 'drizzle-orm';
import { type z } from 'zod';
import {
	twoFactorAuthType,
	unverifiedsessionIdKey,
	verifiedTimeKey,
} from '~/app/routes/_dashboard+/settings+/two-factor-auth';
import { requireUser } from '~/app/utils/auth.server';
import { getDomainUrl } from '~/app/utils/misc';
import { authSessionStorage } from '~/app/utils/session.server';
import { redirectWithToast } from '~/app/utils/toast.server';
import {
	type VerifySchema,
	type VerificationTypeSchema,
} from '~/app/utils/validation-schemas';
import {
	verificationMaxAge,
	verifySessionStorage,
} from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { type User, verifications } from '~/db/schema';
import {
	verifyCodeParamKey,
	verifyRedirectToParamKey,
	verifyTargetParamKey,
	verifyTypeParamKey,
} from './verify';

export type VerifyFunctionArgs = {
	request: Request;
	submission: Submission<
		z.input<typeof VerifySchema>,
		string[],
		z.output<typeof VerifySchema>
	>;
	body: FormData | URLSearchParams;
};

export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

export type GenerateRedirectUrl = {
	redirectUrl?: string;
	request: Request;
	type: VerificationTypes;
	target: string;
};
export function generateRedirectUrl({
	redirectUrl,
	request,
	type,
	target,
}: GenerateRedirectUrl) {
	const url = new URL(`${getDomainUrl(request)}/verify`);
	url.searchParams.set(verifyTypeParamKey, type);
	url.searchParams.set(verifyTargetParamKey, target);
	if (redirectUrl) {
		url.searchParams.set(verifyRedirectToParamKey, redirectUrl);
	}
	return url;
}

export type PrepareTOTP = {
	/**
	 * Number of seconds the "otp" is valid for.
	 * @default `10 * 60 = 10 minutes`
	 */
	period?: number;
	/**
	 * Remix request object.
	 */
	request: Request;
	/**
	 * The type of verification, e.g. "onbaording".
	 */
	type: VerificationTypes;
	/**
	 * The value of the thing we are trying to validate.
	 * @example `email => "piggybank@gmail.com"'
	 */
	target: string;
};
export async function prepareOtpVerification({
	period = verificationMaxAge,
	request,
	type,
	target,
}: PrepareTOTP) {
	const verifyUrl = generateRedirectUrl({
		request,
		target,
		type,
	});

	const { otp, ...totpConfig } = generateTOTP({
		algorithm: 'SHA256',
		charSet: 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789',
		period,
	});

	const verificationConfig = {
		...totpConfig,
		type: 'onboarding',
		target,
		expiresAt: new UTCDate(Date.now() + period * 1000),
	};

	await db
		.insert(verifications)
		.values(verificationConfig)
		.onConflictDoUpdate({
			target: [verifications.target, verifications.type],
			set: verificationConfig,
		});

	/**
	 * We want to return two almost identical URLs "redirectTo" and "verifyUrl".
	 * The only difference is that the "verifyUrl" should have the OTP query param
	 * attached to. It is important not to expose the OTP on the "redirectUrl".
	 */
	const redirectUrl = new URL(verifyUrl);
	verifyUrl.searchParams.set(verifyCodeParamKey, otp);

	return { verifyUrl, otp, redirectUrl };
}

/**
 * This function is used to check if the user has 2FA enabled.
 * If the user has 2FA enabled, it will redirect the user to the verification page.
 * If the user does not have 2FA enabled or they recently verified, will do nothing.
 */
export async function requireRecentTwoFactorAuth(
	request: Request,
	user?: User,
) {
	const _user = user ?? (await requireUser(request));
	const shouldReverify = await shouldRequestTwoFA(request, _user);

	if (shouldReverify) {
		const url = new URL(request.url);
		const redirectUrl = generateRedirectUrl({
			request,
			target: _user.id,
			type: twoFactorAuthType,
			redirectUrl: url.pathname + url.search,
		});

		throw redirectWithToast(redirectUrl.toString(), {
			title: 'Please Reverify',
			description: '2FA is required for this action.',
		});
	}
}

/**
 * Check if a user has an ongoing unverified session, if they do we know they
 * need to verify.
 * Otherwise we are going to check the verified time stamp stored to see if
 * the last time they verified is more than two hours ago.
 */
export async function shouldRequestTwoFA(request: Request, user?: User | null) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	const verifySession = await verifySessionStorage.getSession(
		request.headers.get('Cookie'),
	);

	if (verifySession.has(unverifiedsessionIdKey)) return true;
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

export async function isOtpCodeValid({
	otp,
	target,
	type,
}: {
	otp: string;
	target: string;
	type: VerificationTypes;
}) {
	const verification = await db.query.verifications.findFirst({
		columns: {
			algorithm: true,
			charSet: true,
			digits: true,
			period: true,
			secret: true,
		},
		where: (verification, { and, eq, gt, isNull }) =>
			and(
				eq(verification.target, target),
				eq(verification.type, type),
				or(
					gt(verification.expiresAt, new UTCDate()),
					isNull(verification.expiresAt),
				),
			),
	});

	if (!verification) return false;

	const result = verifyTOTP({
		otp,
		...verification,
	});

	if (!result) return false;

	return true;
}

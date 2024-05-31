import { UTCDate } from '@date-fns/utc';
import { generateTOTP } from '@epic-web/totp';
import { type z } from 'zod';
import { getOriginUrl } from '~/app/utils/misc';
import { type VerificationTypeSchema } from '~/app/utils/validation-schemas';
import { verificationMaxAge } from '~/app/utils/verification.server';
import { db } from '~/db/index.server';
import { verifications } from '~/db/schema';
import {
	verifyCodeParamKey,
	verifyRedirectToParamKey,
	verifyTargetParamKey,
	verifyTypeParamKey,
} from './verify';

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
	const url = new URL(`${getOriginUrl(request)}/verify`);
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

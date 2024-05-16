import { getOriginUrl } from '~/app/utils/misc';
import {
	verifyRedirectToParamKey,
	verifyTargetParamKey,
	verifyTypeParamKey,
} from './verify';

export type VerificationTypes =
	| 'onboarding'
	| '2fa'
	| 'reset-password'
	| 'reset-email';

export type GenerateRedirectUrl = {
	redirectUrl?: string;
	request: Request;
	type: VerificationTypes;
	target: string;
};
export async function generateRedirectUrl({
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
	period,
	request,
	type,
	target,
}: PrepareTOTP) {
	// const verifyUrl =
}

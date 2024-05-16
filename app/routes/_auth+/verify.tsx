import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { Form } from '@remix-run/react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import React from 'react';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from '~/app/components/ui/input-otp';

export const verifyTypeParamKey = 'type';
export const verifyTargetParamKey = 'target';
export const verifyRedirectToParamKey = 'redirectTo';
export const verifyCodeParamKey = 'otp';

// export async function loader({ request }: LoaderFunctionArgs) {
// 	return json({});
// }

// export async function action({ request }: ActionFunctionArgs) {
// 	return json({});
// }

/**
 * Sign up steps:
 * 1. User enters email address submits form
 * 2 action => validate email, check DB
 *    a. generate OTP code
 *    b. generate redirect URL
 *    c. send verification email (in dev just log it)
 *    d. if all went well redirect to the verify route with email saved in the cookie
 * 3. verify route validate otp delete otp form db and send them to the onboarding page
 * 4. fill out form, validate data, create user send them to dashboard
 */

export default function Verify() {
	const [value, setValue] = React.useState('');
	return (
		<div className="flex w-full items-center justify-center py-52">
			<div>
				<h1 className="mb-5 text-4xl font-bold">Verify Route</h1>
				<Form>
					<InputOTP
						maxLength={4}
						pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
						value={value}
						onChange={value => setValue(value)}
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
						</InputOTPGroup>
					</InputOTP>
				</Form>
			</div>
		</div>
	);
}

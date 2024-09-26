import { useForm, getFormProps, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { Form, useActionData } from '@remix-run/react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { z } from 'zod';
import Spinner from '~/app/components/icons/spinner';
import { Button } from '~/app/components/ui/button';
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from '~/app/components/ui/input-otp';
import { useDelayedIsPending } from '~/app/utils/misc';
import { OTPSchema } from '~/app/utils/validation-schemas';

export default function EmailVerify() {
	const actionData = useActionData();
	const isPending = useDelayedIsPending();
	const [form, fields] = useForm({
		id: 'email-verify-form',
		constraint: getZodConstraint(OTPSchema),
		// lastResult: profileSettingsAction?.data,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: OTPSchema });
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	});
	const otp = useInputControl(fields.otp);
	const disableSaveBtn = !fields.otp.value || isPending;

	return (
		<div>
			<div className="mb-5">
				<p>
					To update your email address, please enter the one-time passcode (OTP)
					we've sent to your new email.
				</p>
			</div>
			<Form method="POST" {...getFormProps(form)}>
				<InputOTP
					maxLength={6}
					pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
					name={fields.otp.name}
					value={otp.value}
					onChange={val => otp.change(val.toUpperCase())}
					onBlur={otp.blur}
					onFocus={otp.focus}
					type="text"
					containerClassName="mb-5"
				>
					<InputOTPGroup>
						<InputOTPSlot index={0} />
						<InputOTPSlot index={1} />
						<InputOTPSlot index={2} />
					</InputOTPGroup>
					<InputOTPSeparator />
					<InputOTPGroup>
						<InputOTPSlot index={3} />
						<InputOTPSlot index={4} />
						<InputOTPSlot index={5} />
					</InputOTPGroup>
				</InputOTP>

				<Button
					disabled={disableSaveBtn}
					type="submit"
					name="intent"
					value="update-profile"
				>
					Save
					{isPending && <Spinner className="ml-2" />}
				</Button>
			</Form>
		</div>
	);
}

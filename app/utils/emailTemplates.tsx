import * as E from '@react-email/components';

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string;
	otp: string;
}) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Welcome to Piggy Bank!</E.Text>
				</h1>
				<p>
					<E.Text>
						Here's your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>Or click the link to get started:</E.Text>
				</p>
				<E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
			</E.Container>
		</E.Html>
	);
}

export function ChangeEmail({ url, otp }: { url: string; otp: string }) {
	return (
		<E.Html lang="en" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>Piggy Bank - Confirm Your New Email Address</E.Text>
				</h1>
				<p>
					<E.Text>
						You've requested to change the email address associated with your
						Piggy Bank account. To confirm this change, please verify your new
						email by using the verification code below.
					</E.Text>
				</p>
				<p>
					<E.Text>
						Here's your verification code: <strong>{otp}</strong>
					</E.Text>
				</p>
				<p>
					<E.Text>
						If you'd rather, you can confirm the change by clicking the link
						below:
					</E.Text>
				</p>
				<E.Link href={url}>{url}</E.Link>
				<p>
					<E.Text>
						If you did not request this change, please ignore this email.
					</E.Text>
				</p>
			</E.Container>
		</E.Html>
	);
}

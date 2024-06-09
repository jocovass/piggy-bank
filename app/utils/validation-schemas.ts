import { createId as cuid2 } from '@paralleldrive/cuid2';
import { z } from 'zod';
import { type } from '~/app/routes/_auth+/verify';

export const EmailSchema = z.string().email();
export const RememberSchema = z.boolean().optional();
export const RedirectSchema = z.string().optional();
export const PasswordSchema = z
	.string({ required_error: 'Password is required' })
	.min(8, 'Must be at least 8 character')
	.regex(/[A-Z]/, 'Must contain uppercase letter')
	.regex(/[a-z]/, 'Must contain lowercase letter')
	.regex(/[0-9]/, 'Must contain number')
	.regex(/[^a-z0-9\s]/i, 'Must contain special character');

export const LoginSchema = z.object({
	email: EmailSchema,
	password: z.string({ required_error: 'Password is required' }),
	remember: RememberSchema,
});

export const SignupSchema = z.object({
	email: EmailSchema,
});

export const OnboardingSchema = z
	.object({
		firstName: z
			.string({ required_error: 'First name is required' })
			.min(3, 'Must be at least 3 charcter'),
		lastName: z
			.string({ required_error: 'Last name is required' })
			.min(3, 'Must be at least 3 charcter'),
		password: PasswordSchema,
		confirmPassword: z.string({
			required_error: 'Confirm passowrd is required',
		}),
		remember: RememberSchema,
		redirectTo: RedirectSchema,
	})
	.superRefine(({ confirmPassword, password }, ctx) => {
		if (confirmPassword !== password) {
			ctx.addIssue({
				code: 'custom',
				message: 'Passwords must match',
				path: ['confirmPassword'],
			});
		}
	});

export const OTPSchema = z.object({
	otp: z.string().min(6).max(6),
});
export const VerificationTypeSchema = z.enum(type);
export const VerifySchema = z
	.object({
		target: z.string(),
		type: VerificationTypeSchema,
		redirectTo: RedirectSchema,
	})
	.merge(OTPSchema);

export const ServerToastSchema = z.object({
	description: z.string().optional(),
	id: z
		.string()
		.optional()
		.default(() => cuid2()),
	title: z.string(),
	type: z.enum(['message', 'error', 'success']).default('message'),
});

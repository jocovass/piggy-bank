import { z } from 'zod';

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

export const NameSchema = z.object({
	firstName: z.string().min(3, 'Must be at least 3 charcter'),
	lastName: z.string().min(3, 'Must be at least 3 charcter'),
});

export const OnboardingSchema = z
	.object({
		password: PasswordSchema,
		confirmPassword: z.string({
			required_error: 'Confirm passowrd is required',
		}),
		remember: RememberSchema,
		redirectTo: RedirectSchema,
	})
	.merge(NameSchema)
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

export const ItemSchema = z.object({
	itemId: z.string({ required_error: 'Item ID is required' }).optional(),
});

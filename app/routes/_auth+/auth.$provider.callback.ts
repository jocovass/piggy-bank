import { type LoaderFunctionArgs } from '@remix-run/node';
import { and, eq } from 'drizzle-orm';
import {
	authenticator,
	getSessionExpirationDate,
	getUserFromSession,
	sessionKey,
} from '~/app/utils/auth.server';
import { destroyRedirectToHeader } from '~/app/utils/redirect-cookie.server';
import { authSessionStorage } from '~/app/utils/session.server';
import {
	combineHeaders,
	createToastHeader,
	redirectWithToast,
} from '~/app/utils/toast.server';
import { db } from '~/db/index.server';
import { connections, sessions, userImages, users } from '~/db/schema';
import { ProviderNameSchema } from './auth.$provider';
import { handleNewSession } from './login.server';

const destroyRedirectTo = { 'Set-Cookie': destroyRedirectToHeader };

export async function loader({ request, params }: LoaderFunctionArgs) {
	const provider = ProviderNameSchema.parse(params.provider);

	const result = await authenticator
		.authenticate(provider, request, {
			throwOnError: true,
		})
		.then(profile => ({ success: true, profile }) as const)
		.catch(error => ({ success: false, error }) as const);

	if (!result.success) {
		throw redirectWithToast(
			'/login',
			{
				title: 'Auth failed',
				description: `There was an error authenticating with ${provider}.`,
				type: 'error',
			},
			{ headers: destroyRedirectTo },
		);
	}

	const { profile } = result;

	const existingConnection = await db.query.connections.findFirst({
		where: and(
			eq(connections.providerName, 'github'),
			eq(connections.providerId, profile.id),
		),
		with: { user: { columns: { id: true } } },
	});

	const currentUser = await getUserFromSession(request);

	if (existingConnection && currentUser) {
		/**
		 * Connection is already linked to current user
		 */
		if (existingConnection.user.id === currentUser.id) {
			return redirectWithToast(
				'/dashboard',
				{
					title: 'Already connected',
					description: `Your "${profile.firstName}" ${provider} account is already connected.`,
				},
				{ headers: destroyRedirectTo },
			);
		} else {
			/**
			 * Provider is linked to another account
			 */
			return redirectWithToast(
				'/dashboard',
				{
					title: 'Already connected',
					description: `The "${profile.firstName}" ${provider} account is already connected to another account.`,
				},
				{ headers: destroyRedirectTo },
			);
		}
	}

	/**
	 * Link provider to current user
	 */
	if (currentUser) {
		await db.insert(connections).values({
			providerId: profile.id,
			providerName: 'github',
			userId: currentUser.id,
		});

		return redirectWithToast(
			'/dashboard',
			{
				title: 'Connected',
				description: `You ${profile.firstName} ${provider} account has been connected.`,
			},
			{ headers: destroyRedirectTo },
		);
	}

	/**
	 * Provider was used to sign up before create a new session for user
	 */
	if (existingConnection) {
		return await makeSession(
			{
				request,
				userId: existingConnection.userId,
			},
			{
				headers: await createToastHeader({
					title: 'Auth successful',
					description: `You have successfully authenticated with ${provider}.`,
				}),
			},
		);
	}

	/**
	 * Check if the email exists in the DB, if it does create a new connection
	 * and link it to the user.
	 */
	const user = await db.query.users.findFirst({
		columns: { id: true },
		where: eq(users.email, profile.email.toLowerCase()),
	});

	if (user) {
		await db.insert(connections).values({
			providerId: profile.id,
			providerName: 'github',
			userId: user.id,
		});

		return await makeSession(
			{ request, userId: user.id },
			{
				headers: await createToastHeader({
					title: 'Connected',
					description: `Your ${profile.firstName} ${provider} account has been connected.`,
				}),
			},
		);
	}

	/**
	 * Create a new user and new connection
	 */
	const newUser = await db.transaction(async tx => {
		const [newUser] = await tx
			.insert(users)
			.values({
				email: profile.email.toLowerCase(),
				firstName: profile.firstName,
				lastName: profile.lastName,
			})
			.returning();

		if (profile.image) {
			await tx.insert(userImages).values({
				blob: profile.image.blob,
				file_type: profile.image.file_type,
				name: profile.image.name,
				size: profile.image.size,
				user_id: newUser.id,
			});
		}

		await tx.insert(connections).values({
			providerId: profile.id,
			providerName: 'github',
			userId: newUser.id,
		});

		return newUser;
	});

	return await makeSession({ request, userId: newUser.id });
}

async function makeSession(
	{
		request,
		userId,
	}: {
		request: Request;
		userId: string;
	},
	responseInit?: ResponseInit,
) {
	const [session] = await db
		.insert(sessions)
		.values({
			userId,
			expirationDate: getSessionExpirationDate(),
		})
		.returning();

	const authSession = await authSessionStorage.getSession(
		request.headers.get('Cookie'),
	);
	authSession.set(sessionKey, session.id);

	return handleNewSession(
		{
			request,
			session,
		},
		{
			headers: combineHeaders(responseInit?.headers, destroyRedirectTo, {
				'Set-Cookie': await authSessionStorage.commitSession(authSession),
			}),
		},
	);
}

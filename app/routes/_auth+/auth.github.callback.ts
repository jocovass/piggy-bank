import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/app/utils/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
	console.log('github callback');
	const res = await authenticator
		.authenticate('github', request, {
			// successRedirect: '/',
			// failureRedirect: '/login',
			throwOnError: false,
		})
		.then(() => ({ success: true }))
		.catch(() => ({ success: false }));

	console.log('auth.github.callback', res);

	return redirect('/');
}

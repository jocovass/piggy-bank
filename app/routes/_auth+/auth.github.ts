import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { authenticator } from '~/app/utils/auth.server';

export async function loader() {
	return redirect('/login');
}

export async function action({ request }: ActionFunctionArgs) {
	return await authenticator.authenticate('github', request);
}

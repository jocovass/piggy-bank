import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { requireUser } from '~/app/utils/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUser(request);
	return redirect('/dashboard');
}

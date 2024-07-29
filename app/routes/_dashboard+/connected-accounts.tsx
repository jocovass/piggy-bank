import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getAccounts } from '~/app/data-access/accounts';
import { requireUser } from '~/app/utils/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const accounts = await getAccounts(user.id);
	return json({ accounts });
}

export default function ConnectedAccounts() {
	const data = useLoaderData<typeof loader>();
	console.log(data);

	return (
		<div>
			<h1>Unknown Route</h1>
		</div>
	);
}

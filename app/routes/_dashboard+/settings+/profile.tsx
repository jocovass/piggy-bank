import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { requireUser } from '~/app/utils/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUser(request);
	return json({});
}

export default function SettingsProfile() {
	return (
		<div>
			<h1>Profile</h1>
			<p>Some profile settings</p>
			<p>change name</p>
			<p>change profile picutre</p>
		</div>
	);
}

import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	return json({});
}

export default function Dashboard() {
	return (
		<div>
			<p>DASHBOARD INDEX PAGE</p>
		</div>
	);
}

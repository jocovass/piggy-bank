import {
	type ActionFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { useLoaderData, Form, NavLink } from '@remix-run/react';
import { Button } from '~/app/components/ui/button';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export const loader = async () => {
	return json({ count: 0 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const body = await request.formData();
	const intent = body.get('intent');

	if (intent === 'increment') {
		console.log('increment');
	} else {
		console.log('decrement');
	}

	return json('');
};

export default function Index() {
	const data = useLoaderData<typeof loader>();

	return (
		<Form
			method="POST"
			style={{
				fontFamily: 'system-ui, sans-serif',
				lineHeight: '1.8',
				display: 'flex',
				gap: '8px',
			}}
		>
			<Button
				name="intent"
				value="increment"
				onClick={() => console.log(data?.count)}
			>
				Increment
			</Button>
			<span>
				<b>COUNT: {data?.count}</b>
			</span>
			<Button
				name="intent"
				value="decrement"
				onClick={() => console.log(data?.count)}
			>
				Decrement
			</Button>

			<NavLink to="/signup">signup</NavLink>
		</Form>
	);
}

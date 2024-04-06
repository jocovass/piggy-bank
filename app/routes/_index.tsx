import {
	type ActionFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';
import { eq, sql } from 'drizzle-orm';
import { db } from '~/db/index.server';
import { count } from '~/db/schema';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export const loader = async () => {
	const result = await db.select().from(count);

	return json({ count: result[0].count });
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const body = await request.formData();
	const intent = body.get('intent');

	if (intent === 'increment') {
		await db
			.update(count)
			.set({
				count: sql`${count.count} + 1`,
			})
			.where(eq(count.id, 1));
	} else {
		await db
			.update(count)
			.set({
				count: sql`${count.count} - 1`,
			})
			.where(eq(count.id, 1));
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
			<button
				name="intent"
				value="increment"
				onClick={() => console.log(data?.count)}
			>
				Increment
			</button>
			<span>
				<b>{data?.count}</b>
			</span>
			<button
				name="intent"
				value="decrement"
				onClick={() => console.log(data?.count)}
			>
				Decrement
			</button>
		</Form>
	);
}

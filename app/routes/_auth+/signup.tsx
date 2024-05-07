import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { Field } from '~/app/components/forms';
import { Button } from '~/app/components/ui/button';
// import { db } from '~/db/index.server';

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	console.log(formData.get('email'));
	return json({});
}

export default function SignupRoute() {
	return (
		<div className="flex w-full items-center justify-center py-52">
			<div>
				<h1 className="mb-5 text-4xl font-bold">Signup</h1>
				<Form method="POST">
					<Field
						inputProps={{
							autoComplete: 'off',
							type: 'email',
							id: 'email',
							name: 'email',
						}}
						labelProps={{ children: 'Email' }}
					/>

					<Button type="submit">Submit</Button>
				</Form>
			</div>
		</div>
	);
}

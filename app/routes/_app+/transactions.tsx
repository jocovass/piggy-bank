import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
// import { formatInTimeZone } from 'date-fns-tz';
import { Coin } from '~/app/components/icons/coin';
import { getTransactions } from '~/app/data-access/transactions';
import { requireUser } from '~/app/utils/auth.server';
import { formatCurrency } from '~/app/utils/format-currency';

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const result = await getTransactions({
		userId: user.id,
		limit: 30,
	});

	return json({ transactions: result });
}

export default function Transactions() {
	const loaderData = useLoaderData<typeof loader>();

	console.log(loaderData);

	return (
		<div className="mx-auto max-w-3xl">
			<h1 className="mb-6 px-4 text-xl font-bold">All transactions</h1>

			<ul>
				{loaderData.transactions.map(transaction => {
					return (
						<li
							key={transaction.id}
							className="flex justify-between border-muted px-4 py-3 [&:not(:last-of-type)]:border-b-2"
						>
							<div className="flex items-center gap-2">
								<Avatar className="size-7">
									<AvatarImage
										src={transaction.logo_url as string}
										alt={transaction.name}
									/>

									<AvatarFallback className="bg-transparent">
										<Coin className="size-7 stroke-yellow-300" />
									</AvatarFallback>
								</Avatar>
								<p>{transaction.name}</p>
							</div>
							<div>
								<p>
									{formatCurrency(Number.parseFloat(transaction.amount), {
										minimumFractionDigits: 0,
									})}
								</p>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

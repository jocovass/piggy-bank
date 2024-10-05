import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { type LoaderFunctionArgs, json } from '@remix-run/node';
import {
	type ShouldRevalidateFunction,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';
import { useSpinDelay } from 'spin-delay';
import { z } from 'zod';
import { Coin } from '~/app/components/icons/coin';
import Spinner from '~/app/components/icons/spinner';
import { getTransactions } from '~/app/data-access/transactions';
import { requireUser } from '~/app/utils/auth.server';
import { formatCurrency } from '~/app/utils/format-currency';

export const shouldRevalidate: ShouldRevalidateFunction = () => {
	// we don't want to revalidate this page because it's not dynamic
	return false;
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	const { searchParams } = new URL(request.url);

	const page = z.coerce.number().parse(searchParams.get('page') ?? 0);
	const result = await getTransactions({
		userId: user.id,
		page,
	});

	return json({ transactions: result });
}

const requestLimit = 30;
export default function Transactions() {
	const loaderData = useLoaderData<typeof loader>();
	const [transactions, setTransactions] = useState<
		(typeof loaderData)['transactions']
	>(loaderData.transactions);
	const fetcher = useFetcher<typeof loader>();
	const [page, setPage] = useState(
		() => Math.ceil(transactions.length / requestLimit) ?? 1,
	);
	const isPending = useSpinDelay(fetcher.state !== 'idle', {
		minDuration: 1000,
	});

	const bottomObserverRef = useRef<HTMLLIElement>(null);
	const parentRef = useRef<HTMLDivElement>(null);
	const virtualizer = useWindowVirtualizer({
		count: transactions.length,
		estimateSize: () => 54,
		scrollMargin: parentRef.current?.offsetTop ?? 0,
		overscan: 1,
	});

	useEffect(() => {
		const data = fetcher.data?.transactions;
		if (data && data.length > 0) {
			setTransactions(prev => [...prev, ...data]);
			setPage(prev => prev + 1);
		}
	}, [fetcher.data]);

	useEffect(() => {
		if (parentRef.current) {
			const oberver = new IntersectionObserver(
				entries => {
					entries.forEach(entry => {
						const data = fetcher.data?.transactions;
						if (
							entry.isIntersecting &&
							fetcher.state === 'idle' &&
							(!data || data.length >= requestLimit)
						) {
							fetcher.load(`/transactions?page=${page}`);
						}
					});
				},
				{
					rootMargin: '0px 0px 50px 0px',
				},
			);
			if (bottomObserverRef.current) {
				oberver.observe(bottomObserverRef.current);
			}
			return () => oberver.disconnect();
		}
	}, [fetcher, page]);

	return (
		<div className="mx-auto mb-8 max-w-3xl">
			<h1 className="mb-6 px-4 text-xl font-bold">All transactions</h1>

			<div ref={parentRef} className="List">
				<ul
					className={`relative w-full`}
					style={{
						height: `${virtualizer.getTotalSize()}px`,
					}}
				>
					{virtualizer.getVirtualItems().map(item => {
						const transaction = transactions[item.index];

						return (
							<li
								key={item.key}
								className="absolute left-0 top-0 flex w-full justify-between border-muted px-4 py-3 [&:not(:last-of-type)]:border-b-2"
								style={{
									height: `${item.size}px`,
									transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
								}}
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

					<li
						className={`absolute -bottom-4 left-[50%] translate-x-[-50%] transition-[transform,opacity] ${isPending ? 'opacity-1 scale-1 translate-y-3' : 'translate-y-6 scale-0 opacity-0'}`}
					>
						<Spinner className="size-6" />
					</li>
				</ul>
				<li ref={bottomObserverRef} className="sr-only"></li>
			</div>
		</div>
	);
}

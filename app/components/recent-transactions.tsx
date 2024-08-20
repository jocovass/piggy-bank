import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { formatInTimeZone } from 'date-fns-tz';
import React from 'react';
import { ArrowPath } from '~/app/components/icons/arrow-path';
import { Check } from '~/app/components/icons/check';
import { Coin } from '~/app/components/icons/coin';
import { useHints } from '~/app/utils/client-hints';
import { formatCurrency } from '~/app/utils/format-currency';
import { type Transaction } from '~/db/schema';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './ui/table';

export default function RecentTransactions({
	transactions,
}: {
	transactions: Transaction[];
}) {
	const hints = useHints();

	const columns: ColumnDef<Transaction>[] = [
		{
			accessorKey: 'logo_url',
			header: 'Logo',
			cell: ({ row }) => (
				<Avatar className="h-8 w-8">
					<AvatarImage
						src={row.getValue('logo_url')}
						alt={row.getValue('name')}
					/>
					<AvatarFallback className="bg-transparent">
						<Coin className="size-8 stroke-yellow-300" />
					</AvatarFallback>
				</Avatar>
			),
		},
		{
			accessorKey: 'name',
			header: 'Name',
			cell: ({ row }) => <div>{row.getValue('name')}</div>,
		},
		{
			accessorKey: 'amount',
			header: 'Amount',
			cell: ({ row }) => {
				const amount = formatCurrency(
					Number.parseFloat(row.getValue('amount')),
				);
				return <div>{amount}</div>;
			},
		},
		{
			accessorKey: 'authorized_date',
			header: 'Date',
			cell: ({ row }) => {
				const date = formatInTimeZone(
					row.getValue('authorized_date'),
					hints.timeZone,
					'dd.MM.yyyy',
				);

				return <div>{date}</div>;
			},
		},
		{
			accessorKey: 'category',
			header: 'Category',
			cell: ({ row }) => {
				return <div>{row.getValue('category')}</div>;
			},
		},
		{
			accessorKey: 'payment_channel',
			header: 'Payment channel',
			cell: ({ row }) => {
				return <div>{row.getValue('payment_channel')}</div>;
			},
		},
		{
			accessorKey: 'pending',
			header: () => 'Pending',
			cell: ({ row }) => {
				const isPending = row.getValue('pending');
				return (
					<div
						className={`flex h-5 w-5 items-center justify-center rounded-full ${isPending ? 'bg-yellow-300' : 'bg-green-600'}`}
					>
						{isPending ? (
							<ArrowPath className="size-4 stroke-2" />
						) : (
							<Check className="size-4 stroke-2" />
						)}
					</div>
				);
			},
		},
	];

	console.log(transactions);

	const table = useReactTable({
		data: transactions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="w-full">
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id} className="bg-card">
								{headerGroup.headers.map(header => {
									return (
										<TableHead
											key={header.id}
											className="min-w-20 font-bold text-card-foreground"
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map(cell => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

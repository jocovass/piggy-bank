import { cn } from '~/app/utils/misc';

export default function CreditCard({ className }: { className?: string }) {
	return (
		<svg
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className={cn('size-6', className)}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
			/>
		</svg>
	);
}

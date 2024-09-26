import { cn } from '~/app/utils/misc';

export default function Minus({ className }: { className?: string }) {
	return (
		<svg
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className={cn('size-6', className)}
		>
			<path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
		</svg>
	);
}

import { NavLink } from '@remix-run/react';
import { cn } from '~/app/utils/misc';

export default function NavItem({
	to,
	children,
	className,
}: {
	to: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				cn(
					'flex items-center gap-x-2 rounded-sm p-2 text-sm leading-6 ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					isActive &&
						'bg-foreground text-white hover:bg-foreground/90 dark:bg-muted dark:hover:bg-accent',
					className,
				)
			}
		>
			{children}
		</NavLink>
	);
}

import { PopoverContent } from '@radix-ui/react-popover';
import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { NavLink, Outlet, useLoaderData } from '@remix-run/react';
import ArrowRightRect from '~/app/components/icons/arrow-right-rect';
import AvatarIcon from '~/app/components/icons/avatar';
import ChevronDown from '~/app/components/icons/chevron-down';
import CreditCard from '~/app/components/icons/credit-card';
import RectangleGroup from '~/app/components/icons/rectangle-group';
import Settings from '~/app/components/icons/settings';
import Transaction from '~/app/components/icons/transaction';
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
} from '~/app/components/ui/avatar';
import { Button } from '~/app/components/ui/button';
import { PopoverTrigger, Popover } from '~/app/components/ui/popover';
import { requireUser } from '~/app/utils/auth.server';
import { cn } from '~/app/utils/misc';

export const meta: MetaFunction = () => {
	return [
		{ title: 'New Remix App' },
		{ name: 'description', content: 'Welcome to Remix!' },
	];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await requireUser(request);
	return json({ user: user });
}

export default function Layout() {
	const data = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="fixed bottom-0 left-0 top-0 z-50 w-72 overflow-y-auto border-r border-border">
				<div className="flex h-full flex-col gap-y-5 px-6 pb-4">
					<div className="flex h-16 items-center">
						<p className="font-bold">Piggy-Bank</p>
					</div>

					<nav className="flex flex-1 flex-col">
						<ul className="flex flex-1 flex-col gap-y-7">
							<li>
								<ul>
									<li className="mb-1.5">
										<NavItem to="/dashboard">
											<RectangleGroup className="size-5" />
											Dashboard
										</NavItem>
									</li>
									<li className="mb-1.5">
										<NavItem to="/transactions">
											<Transaction className="size-5" />
											Transactions
										</NavItem>
									</li>
									<li>
										<NavItem to="/accounts">
											<CreditCard className="size-5" />
											Accounts
										</NavItem>
									</li>
								</ul>
							</li>
							<li className="mt-auto">
								<ul>
									<li className="mb-1.5">
										<NavItem to="/settings/profile">
											<Settings className="size-5" />
											Settings
										</NavItem>
									</li>
									<li>
										<form action="/logout" method="POST">
											<Button
												type="submit"
												variant="ghost"
												className="flex w-full items-center justify-start gap-x-2 p-2 leading-6 hover:bg-accent"
											>
												<ArrowRightRect className="size-5" />
												Logout
											</Button>
										</form>
									</li>
								</ul>
							</li>
						</ul>
					</nav>
				</div>
			</div>

			<div className="h-screen pl-72">
				<header className="sticky top-0 z-50 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div />
					<div>
						<Popover>
							<PopoverTrigger asChild>
								<button
									className="flex items-center gap-2 px-2"
									aria-haspopup="menu"
									aria-expanded="false"
								>
									<span className="sr-only">Open menu</span>
									<Avatar className="h-7 w-7">
										<AvatarImage
											src="https://localhost:3000/avatar.png"
											alt="Avatar"
										/>
										<AvatarFallback className="bg-transparent">
											<AvatarIcon className="size-7 text-foreground/50" />
										</AvatarFallback>
									</Avatar>
									<span className="flex items-center gap-2 text-xs" aria-hidden>
										{data.user.firstName} {data.user.lastName}
										<ChevronDown className="size-3" />
									</span>
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="end"
								className="shadow-backkground w-[150px] rounded-md bg-background p-2 shadow-sm"
							>
								<NavItem className="mb-2 text-xs" to="/settings/profile">
									<Settings className="size-5" />
									Settings
								</NavItem>
								<form action="/logout" method="POST">
									<Button
										type="submit"
										size="sm"
										variant="ghost"
										className="flex w-full items-center justify-start gap-x-2 p-2 text-xs hover:bg-accent"
									>
										<ArrowRightRect className="size-5" />
										Logout
									</Button>
								</form>
							</PopoverContent>
						</Popover>
					</div>
				</header>

				<main className="p-4">
					<Outlet />
				</main>
			</div>
		</div>
	);
}

function NavItem({
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
					'flex items-center gap-x-2 rounded-sm p-2 text-sm leading-6 transition-colors hover:bg-accent',
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

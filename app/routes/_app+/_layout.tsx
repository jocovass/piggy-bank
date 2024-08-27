import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { NavLink, Outlet, useLoaderData } from '@remix-run/react';
import ArrowRightRect from '~/app/components/icons/arrow-right-rect';
import CreditCard from '~/app/components/icons/credit-card';
import RectangleGroup from '~/app/components/icons/rectangle-group';
import Settings from '~/app/components/icons/settings';
import Transaction from '~/app/components/icons/transaction';
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
	console.log(data);

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
										<NavItem to="/logout">
											<ArrowRightRect className="size-5" />
											Logout
										</NavItem>
									</li>
								</ul>
							</li>
						</ul>
					</nav>
				</div>
			</div>

			<div className="h-screen pl-72">
				<div className="">Header</div>
				<main className="p-4">
					<Outlet />
				</main>
			</div>
		</div>
	);
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				cn(
					'flex items-center gap-x-2 rounded-sm p-2 text-sm leading-6 transition-colors hover:bg-accent',
					isActive &&
						'bg-foreground text-white hover:bg-foreground/90 dark:bg-muted dark:hover:bg-accent',
				)
			}
		>
			{children}
		</NavLink>
	);
}

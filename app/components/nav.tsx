import ArrowRightRect from '~/app/components/icons/arrow-right-rect';
import RectangleGroup from '~/app/components/icons/rectangle-group';
import Settings from '~/app/components/icons/settings';
import Transaction from '~/app/components/icons/transaction';
import NavItem from './nav-item';
import { Button } from './ui/button';

export default function Nav() {
	return (
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
						{/* <li>
							<NavItem to="/accounts">
								<CreditCard className="size-5" />
								Accounts
							</NavItem>
						</li> */}
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
	);
}

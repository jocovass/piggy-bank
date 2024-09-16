import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import ArrowRightRect from '~/app/components/icons/arrow-right-rect';
import AvatarIcon from '~/app/components/icons/avatar';
import BarsLeft from '~/app/components/icons/bars-left';
import ChevronDown from '~/app/components/icons/chevron-down';
import Settings from '~/app/components/icons/settings';
import XMark from '~/app/components/icons/x-mark';
import Nav from '~/app/components/nav';
import NavItem from '~/app/components/nav-item';
import ThemeSwitch from '~/app/components/theme-switch';
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
} from '~/app/components/ui/avatar';
import { Button } from '~/app/components/ui/button';
import {
	PopoverContent,
	PopoverTrigger,
	Popover,
} from '~/app/components/ui/popover';
import { Separator } from '~/app/components/ui/separator';
import { requireUser } from '~/app/utils/auth.server';
import { usePresence } from '~/app/utils/usePresence';
import { useUser } from '~/app/utils/user';

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
	const user = useUser();
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const md = window.matchMedia('(min-width: 1024px)');
		setIsMobile(!md.matches);
		function handleMediaChange(e: MediaQueryListEvent) {
			setIsMobile(!e.matches);
		}
		md.addEventListener('change', handleMediaChange);
		return () => {
			md.removeEventListener('change', handleMediaChange);
		};
	}, []);

	return (
		<div>
			<div className="fixed bottom-0 left-0 top-0 z-50 hidden w-72 overflow-y-auto border-r border-border lg:block">
				<div className="flex h-full flex-col gap-y-5 px-6 pb-4">
					<div className="flex h-16 items-center">
						<p className="font-bold">Piggy-Bank</p>
					</div>
					<Nav />
				</div>
			</div>

			<div className="h-screen lg:pl-72">
				<header className="sticky top-0 z-50 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					{isMobile && <MobileNavigation />}

					<div />

					<div className="flex items-center gap-2">
						<ThemeSwitch />
						<Separator orientation="vertical" className="h-6" />
						<Popover>
							<PopoverTrigger asChild>
								<button
									className="flex items-center gap-2 px-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									aria-haspopup="menu"
									aria-expanded="false"
								>
									<span className="sr-only">Open menu</span>
									<Avatar className="h-7 w-7">
										<AvatarImage
											className="object-cover"
											src={`data:image/jpeg;base64,${user.avatar}`}
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

function MobileNavigation() {
	const [isOpen, setIsOpen] = useState(false);
	const { isPresent, ref } = usePresence(isOpen);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				onClick={() => setIsOpen(prev => !prev)}
			>
				<span className="sr-only">Open mobile navigation</span>
				<BarsLeft className="size-5" />
			</Button>

			{isPresent && (
				<div
					className={`fixed left-0 right-0 top-0 z-50 h-screen bg-black/80 ${isOpen ? 'animate-in fade-in-25' : 'animate-out fade-out'}`}
					onClick={() => setIsOpen(false)}
				>
					<div
						ref={ref}
						className={`flex h-full max-w-72 flex-col gap-y-5 bg-background px-6 pb-4 shadow-md transition-transform ${isOpen ? 'animate-in slide-in-from-left' : 'animate-out slide-out-to-left'}`}
					>
						<div className="flex h-16 items-center justify-between">
							<p className="font-bold">Piggy-Bank</p>

							<Button
								size="icon"
								variant="ghost"
								className="size-8 rounded-full"
								onClick={() => setIsOpen(false)}
							>
								<span className="sr-only">Close mobile navigation</span>
								<XMark className="size-5" />
							</Button>
						</div>

						<Nav />
					</div>
				</div>
			)}
		</>
	);
}

import { Outlet, NavLink } from '@remix-run/react';

export default function Layout() {
	return (
		<div className="relative min-h-screen w-full">
			<div className="absolute h-full w-full bg-[radial-gradient(#d4d6d9_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#ffffff33_1px,transparent_1px)]" />

			<div className="absolute left-4 top-4 inline-block">
				<NavLink to="/" className="text-2xl font-semibold tracking-tight">
					Piggy Bank
				</NavLink>
			</div>

			<div className="relative z-10 ml-auto min-h-screen w-[50%] max-w-xl border-l-muted bg-background/95 backdrop-blur-[2px] supports-[backdrop-filter]:bg-background/5">
				<Outlet />
			</div>
		</div>
	);
}

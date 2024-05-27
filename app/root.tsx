import {
	type LinksFunction,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node';
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from '@remix-run/react';
import tailwindCss from '~/app/styles/tailwind.css?url';
import { getUserFromSession } from './utils/auth.server';

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindCss }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await getUserFromSession(request);
	return json({ user });
}

export function Document({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return (
		<Document>
			<Outlet />
		</Document>
	);
}

export function ErrorBoundary() {
	return (
		<Document>
			<div className="flex items-center justify-center">
				<h1 className="text-4xl">Something went wront!</h1>
			</div>
		</Document>
	);
}

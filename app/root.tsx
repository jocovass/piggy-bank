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
import { Toaster } from '~/app/components/ui/sonner';
import tailwindCss from '~/app/styles/tailwind.css?url';
import { getUserFromSession } from './utils/auth.server';
import { getToastFromRequest } from './utils/toast.server';

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindCss }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await getUserFromSession(request);
	const { toast, toastHeader } = await getToastFromRequest(request);
	return json(
		{ user, toast },
		{ headers: toastHeader ? { 'Set-Cookie': toastHeader } : undefined },
	);
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
				<Toaster position="bottom-right" />
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

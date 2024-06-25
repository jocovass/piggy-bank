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
	useLoaderData,
	useRouteError,
} from '@remix-run/react';
import { Toaster } from '~/app/components/ui/sonner';
import tailwindCss from '~/app/styles/tailwind.css?url';
import { getUserFromSession } from './utils/auth.server';
import { ClientHintCheck, getHints } from './utils/client-hints';
import { getToastFromRequest } from './utils/toast.server';
import { useToast } from './utils/toaster';

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindCss }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const user = await getUserFromSession(request);
	const { toast, toastHeader } = await getToastFromRequest(request);
	return json(
		{ user, toast, hints: getHints(request) },
		{ headers: toastHeader ? { 'Set-Cookie': toastHeader } : undefined },
	);
}

export function Document({
	children,
	theme,
}: {
	children: React.ReactNode;
	theme: 'dark' | 'light';
}) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<ClientHintCheck />
				<Meta />
				<Links />
			</head>
			<body className={theme}>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	const data = useLoaderData<typeof loader>();
	useToast(data.toast);

	return (
		<Document theme={data.hints.theme}>
			<Outlet />
			<Toaster position="bottom-right" />
		</Document>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	const data = useLoaderData<typeof loader>();
	return (
		<Document theme={data.hints.theme}>
			<div className="flex items-center justify-center">
				<h1 className="text-4xl">Something went wront!</h1>
				<pre>{JSON.stringify(error, null, 2)}</pre>
			</div>
		</Document>
	);
}

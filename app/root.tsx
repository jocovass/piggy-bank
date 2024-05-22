import { UTCDate } from '@date-fns/utc';
import {
	type LinksFunction,
	type LoaderFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from '@remix-run/react';
import tailwindCss from '~/app/styles/tailwind.css?url';
import { db } from '~/db/index.server';
import { sessionKey } from './utils/auth.server';
import { authSessionStorage } from './utils/session.server';

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindCss }];
};

export async function loader({ request }: LoaderFunctionArgs) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	);
	const sessionId = authSession.get(sessionKey);
	const sessionWithUser = sessionId
		? await db.query.sessions.findFirst({
				where: (session, { eq, and, gt }) =>
					and(
						eq(session.id, sessionId),
						gt(session.expirationDate, new UTCDate()),
					),
				with: { user: true },
			})
		: null;

	if (!sessionWithUser) {
		return redirect('/login', {
			headers: {
				'set-header': await authSessionStorage.destroySession(authSession),
			},
		});
	}

	return json(
		{ data: sessionWithUser?.user },
		{
			headers: {
				'set-cookie': await authSessionStorage.commitSession(authSession),
			},
		},
	);
}

export function Layout({ children }: { children: React.ReactNode }) {
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
	return <Outlet />;
}

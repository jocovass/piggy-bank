import { useFetcher } from '@remix-run/react';
import { useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function LaunchLink({
	link,
	userId,
}: {
	link: string;
	userId: string;
}) {
	const exchangeToken = useFetcher();

	const { open, ready } = usePlaidLink({
		onSuccess: (publicToken, metadata) => {
			console.log(publicToken, metadata);
			exchangeToken.submit(
				{
					publicToken,
					userId,
				},
				{ action: '/exchange-public-token', method: 'POST' },
			);
		},
		onExit: error => {
			console.log('exit');
		},
		onEvent: event => {
			console.log(event);
		},
		token: link,
	});

	useEffect(() => {
		if (ready) {
			open();
		}
	}, [link, open, ready, userId]);

	return <></>;
}

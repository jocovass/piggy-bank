import { useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function RenderPlaidLink({
	link,
	userId,
}: {
	link: string;
	userId: string;
}) {
	const { open, ready } = usePlaidLink({
		onSuccess: data => {
			console.log(data);
		},
		onExit: () => {
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
	}, [open, ready, userId]);

	return <></>;
}

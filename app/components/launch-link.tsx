import { useFetcher } from '@remix-run/react';
import { useCallback, useEffect } from 'react';
import {
	type PlaidLinkOnSuccess,
	type PlaidLinkOnExit,
	type PlaidLinkOnEvent,
	type PlaidLinkOptionsWithLinkToken,
	usePlaidLink,
} from 'react-plaid-link';
import { plaidOauthConfigKey } from '~/app/routes/_dashboard+/plaid-oauth';
import { type action } from '~/app/routes/_resources+/exchange-public-token';

export default function LaunchLink({
	isOauth = false,
	itemId,
	link,
	userId,
}: {
	isOauth?: boolean;
	itemId?: string;
	link: string;
	userId: string;
}) {
	const exchangeToken = useFetcher<typeof action>();

	const onSuccess = useCallback<PlaidLinkOnSuccess>(
		(publicToken, metadata) => {
			exchangeToken.submit(
				{
					publicToken,
					userId,
				},
				{ action: '/exchange-public-token', method: 'POST' },
			);
		},
		[exchangeToken, userId],
	);

	const onExit = useCallback<PlaidLinkOnExit>(error => {
		if (error && error.error_code === 'IVALID_LINK_TOKEN') {
			// generate new link
			console.log('error', error);
		}
	}, []);

	const onEvent = useCallback<PlaidLinkOnEvent>(event => {
		console.log(event);
	}, []);

	const config: PlaidLinkOptionsWithLinkToken = {
		token: link,
		onSuccess,
		onExit,
		onEvent,
	};

	if (isOauth) {
		/**
		 * Pass in the received redirect URI, which contains an OAuth state ID parameter
		 * that is required to re-initialize Link
		 */
		config.receivedRedirectUri = window.location.href;
	}

	const { open, ready, error } = usePlaidLink(config);

	useEffect(() => {
		if (ready && isOauth) {
			open();
		} else if (ready) {
			/**
			 * Non OAuth case:
			 * Store the link token in local storage so we can use it later if needed
			 * by OAuth.
			 */
			localStorage.setItem(
				plaidOauthConfigKey,
				JSON.stringify({
					itemId,
					link,
					userId,
				}),
			);
			open();
		}
	}, [isOauth, itemId, link, open, ready, userId]);

	if (error) {
		return (
			<>
				<p>There was an error while trying to authenticate with Plaid</p>
				<p>{error.message}</p>
			</>
		);
	}

	return <></>;
}

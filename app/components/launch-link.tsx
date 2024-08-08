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
import { type action as bankConnectionAction } from '~/app/routes/_resources+/bank-connection';
import { type action as exchangeTokenAction } from '~/app/routes/_resources+/exchange-public-token';
import { type action as generateLinkTokenAction } from '~/app/routes/_resources+/generate-link-token';

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
	const reGenerateLinkToken = useFetcher<typeof generateLinkTokenAction>();
	const exchangeToken = useFetcher<typeof exchangeTokenAction>();
	const updateBankConnection = useFetcher<typeof bankConnectionAction>();
	const computedLink =
		reGenerateLinkToken.data?.status === 'success'
			? reGenerateLinkToken.data.data.link_token || link
			: link;

	const onSuccess = useCallback<PlaidLinkOnSuccess>(
		(publicToken, { institution }) => {
			/**
			 * If the itemId is passed in, we are in "update mode" so no need to
			 * exchange the public token.
			 */
			if (itemId) {
				updateBankConnection.submit(
					{ itemId },
					{
						action: '/bank-connection',
						method: 'POST',
					},
				);
			} else {
				exchangeToken.submit(
					{
						institutionId: institution?.institution_id ?? null,
						publicToken,
						userId,
					},
					{ action: '/exchange-public-token', method: 'POST' },
				);
			}
		},
		[exchangeToken, itemId, updateBankConnection, userId],
	);

	const onExit = useCallback<PlaidLinkOnExit>(
		error => {
			if (error && error.error_code === 'IVALID_LINK_TOKEN') {
				reGenerateLinkToken.submit(null, {
					action: '/generate-link-token',
					method: 'POST',
				});
			}
		},
		[reGenerateLinkToken],
	);

	const onEvent = useCallback<PlaidLinkOnEvent>(event => {
		console.log(event);
	}, []);

	const config: PlaidLinkOptionsWithLinkToken = {
		token: computedLink,
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

	const { open, ready } = usePlaidLink(config);

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
					link: computedLink,
					userId,
				}),
			);
			open();
		}
	}, [computedLink, isOauth, itemId, open, ready, userId]);

	return <></>;
}

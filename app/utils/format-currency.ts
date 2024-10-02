export function formatCurrency(
	amount: number,
	options: Intl.NumberFormatOptions = {},
) {
	return amount.toLocaleString('en-GB', {
		style: 'currency',
		currency: 'GBP',
		...options,
	});
}

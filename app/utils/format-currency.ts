export function formatCurrency(amount: number) {
	return amount.toLocaleString('en-GB', {
		style: 'currency',
		currency: 'GBP',
	});
}

import { test } from '@playwright/test';

test('event should work', async ({ page }) => {
	await page.goto('/');
});

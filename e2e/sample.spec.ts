import { test, expect } from '@playwright/test';

test('renders the Three.js canvas on the page', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Three.js Cube');

	const canvas = page.locator('canvas');
	await expect(canvas).toBeVisible();
});

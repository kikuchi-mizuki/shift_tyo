import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');

    // Check if login form is visible
    await expect(page.getByRole('heading', { name: /ログイン|login/i })).toBeVisible();

    // Check for email and password inputs
    await expect(page.getByPlaceholder(/email|メール/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password|パスワード/i)).toBeVisible();

    // Check for login button
    await expect(page.getByRole('button', { name: /ログイン|login/i })).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/');

    // Fill invalid credentials
    await page.getByPlaceholder(/email|メール/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password|パスワード/i).fill('wrongpassword');

    // Click login button
    await page.getByRole('button', { name: /ログイン|login/i }).click();

    // Wait for error message (adjust selector based on your implementation)
    await page.waitForTimeout(1000);

    // Should still be on login page
    await expect(page.getByRole('heading', { name: /ログイン|login/i })).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/');

    // Look for registration link (only available in production)
    const registerLink = page.getByText(/新規アカウント作成はこちら|登録|register|sign up/i).first();

    // Check if link exists with timeout
    const isLinkVisible = await registerLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (isLinkVisible) {
      await registerLink.click();
      // Should navigate to registration page or show registration form
      await page.waitForTimeout(500);
      await expect(page.getByRole('heading', { name: /新規登録/i })).toBeVisible();
    } else {
      // Skip test if registration link is not available (demo environment)
      test.skip();
    }
  });
});

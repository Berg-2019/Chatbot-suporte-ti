import { Page } from '@playwright/test';

export async function loginAs(
  page: Page,
  email: string,
  password: string,
  sector: 'TI' | 'ELECTRIC' | 'COMPRAS'
): Promise<void> {
  const baseUrls = {
    TI: process.env.TI_URL || 'http://ti.helpdeskmsm.local',
    ELECTRIC: process.env.ELECTRIC_URL || 'http://eletrica.helpdeskmsm.local',
    COMPRAS: process.env.COMPRAS_URL || 'http://compras.helpdeskmsm.local',
  };

  const baseUrl = baseUrls[sector];

  await page.goto(`${baseUrl}/login`);

  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
  const passwordInput = page.getByLabel(/senha|password/i).or(page.locator('input[type="password"]'));
  const submitButton = page.getByRole('button', { name: /entrar|login|sign in/i });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  // Após login a app navega para "/" (home autenticada); aguarda sair de /login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

export async function logout(page: Page): Promise<void> {
  const logoutButton = page.getByRole('button', { name: /logout|sair|exit|sign out/i })
    .or(page.locator('[data-testid="logout"], [aria-label="logout"], button[aria-label="logout"]'));

  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL(/login/, { timeout: 5000 });
  }
}

export async function waitForDashboard(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="dashboard"], [class*="dashboard"], nav', { timeout: 10000 });
}

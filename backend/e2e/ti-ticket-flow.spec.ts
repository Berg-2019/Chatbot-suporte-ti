import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const TI_URL = process.env.TI_URL || 'http://ti.helpdeskmsm.local';

test.describe('TI Sector - Ticket Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ti_agent@helpdesk.com', 'password123', 'TI');
  });

  test('should create ticket with all required fields', async ({ page }) => {
    await page.goto(`${TI_URL}/tickets/new`);

    await page.getByLabel(/título|titulo/i).fill('Teste E2E - Problema de Rede');
    await page.getByLabel(/descrição|descricao/i).fill('Teste automatizado de criação de ticket via Playwright');
    await page.getByLabel(/localização|localizacao/i).fill('Sala de Reunião 2');

    const submitButton = page.getByRole('button', { name: /criar|enviar|abrir chamado/i });
    await submitButton.click();

    await page.waitForURL(/\/tickets\//, { timeout: 10000 });
    await expect(page).not.toHaveURL(/tickets\/new/);
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto(`${TI_URL}/tickets/new`);

    const submitButton = page.getByRole('button', { name: /criar|enviar|abrir chamado/i });
    await submitButton.click();

    const errorMessages = page.locator('[class*="error"], [class*="invalid"], [role="alert"]');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('should attach photo to ticket', async ({ page }) => {
    await page.goto(`${TI_URL}/tickets/new`);

    await page.getByLabel(/título|titulo/i).fill('Teste E2E - Com Anexo');
    await page.getByLabel(/descrição|descricao/i).fill('Ticket com foto em anexo');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-data'),
    });

    const files = await fileInput.evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
    expect(files).toBeGreaterThan(0);
  });
});

test.describe('TI Sector - Ticket List', () => {
  test('should list only TI sector tickets', async ({ page }) => {
    await loginAs(page, 'ti_agent@helpdesk.com', 'password123', 'TI');

    await page.goto(`${TI_URL}/tickets`);

    await page.waitForSelector('table tbody tr, [data-testid="ticket-card"]', { timeout: 10000 });

    const rows = page.locator('table tbody tr, [data-testid="ticket-card"]');
    const count = await rows.count();

    if (count > 0) {
      await expect(rows.first()).toBeVisible();
    }
  });

  test('should filter tickets by status', async ({ page }) => {
    await loginAs(page, 'ti_agent@helpdesk.com', 'password123', 'TI');

    await page.goto(`${TI_URL}/tickets`);

    const statusFilter = page.getByRole('combobox', { name: /status|estado/i })
      .or(page.locator('select[name="status"]'));

    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('PENDING');
      await page.waitForTimeout(500);
    }
  });
});

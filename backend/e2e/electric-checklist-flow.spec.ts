import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const ELECTRIC_URL = process.env.ELECTRIC_URL || 'http://eletrica.helpdeskmsm.local';

test.describe('ELECTRIC Sector - Safety Checklist Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'electric_agent@helpdesk.com', 'password123', 'ELECTRIC');
  });

  test('should fill safety checklist before electrical work', async ({ page }) => {
    await page.goto(`${ELECTRIC_URL}/safety/checklist`);

    await page.waitForSelector('[role="checkbox"], input[type="checkbox"]', { timeout: 10000 });

    const checklistItems = page.locator('[role="checkbox"], input[type="checkbox"]');
    const itemCount = await checklistItems.count();
    expect(itemCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(itemCount, 5); i++) {
      const item = checklistItems.nth(i);
      if (!(await item.isChecked())) {
        await item.check();
      }
    }

    const submitButton = page.getByRole('button', { name: /enviar|finalizar|submeter/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should scan QR code and view asset details', async ({ page }) => {
    await page.goto(`${ELECTRIC_URL}/assets/scan`);

    await expect(page.locator('text=/escanear|scanner|câmera|camera|qr/i').first()).toBeVisible({ timeout: 5000 });

    await page.getByPlaceholder(/patrimônio|patrimonio|asset|código|codigo/i)
      .fill('PAT-2024-ELECTRIC-001');

    await page.getByRole('button', { name: /buscar|consultar|search|i$/ }).click();

    await expect(page.locator('text=/patrimônio|patrimonio|ativo|asset|equipamento/i').first())
      .toBeVisible({ timeout: 5000 });
  });

  test('should create ELECTRIC ticket with equipment info', async ({ page }) => {
    await page.goto(`${ELECTRIC_URL}/tickets/new`);

    await page.getByLabel(/título|titulo/i).fill('Manutenção Elétrica - QDG-01');
    await page.getByLabel(/descrição|descricao/i).fill('Inspeção e manutenção preventiva no Quadro de Distribuição Geral');
    await page.getByLabel(/equipamento|equip/i).fill('QDG-01 - Quadro de Distribuição Geral');

    const submitButton = page.getByRole('button', { name: /criar|enviar|abrir chamado/i });
    await submitButton.click();

    await page.waitForURL(/\/tickets\//, { timeout: 10000 });
    await expect(page).not.toHaveURL(/tickets\/new/);
  });
});

test.describe('ELECTRIC Sector - NR-10 Compliance', () => {
  test('should display NR-10 safety warning', async ({ page }) => {
    await loginAs(page, 'electric_agent@helpdesk.com', 'password123', 'ELECTRIC');

    await page.goto(`${ELECTRIC_URL}/tickets/new`);

    const nr10Warning = page.locator('text=/nr-10|certificação|certificacao|habilitação|habilitacao|segurança|seguranca/i');
    await expect(nr10Warning.first()).toBeVisible({ timeout: 5000 });
  });
});

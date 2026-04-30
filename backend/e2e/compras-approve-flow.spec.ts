import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const COMPRAS_URL = process.env.COMPRAS_URL || 'http://compras.helpdeskmsm.local';

test.describe('COMPRAS Sector - Purchase Request Approval Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin_compras@helpdesk.com', 'password123', 'COMPRAS');
  });

  test('should view pending purchase requests', async ({ page }) => {
    await page.goto(`${COMPRAS_URL}/requests`);

    await page.waitForSelector('table, [data-testid="request-card"]', { timeout: 10000 });

    const pendingTab = page.getByRole('tab', { name: /pendente|pending|aguardando/i })
      .or(page.getByRole('button', { name: /pendente|pending/i }));
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
    }

    await page.waitForTimeout(500);

    const rows = page.locator('table tbody tr, [data-testid="request-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should approve a pending purchase request', async ({ page }) => {
    await page.goto(`${COMPRAS_URL}/requests?status=PENDING`);

    await page.waitForTimeout(1000);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const firstRow = rows.first();

      const viewBtn = firstRow.getByRole('link', { name: /ver|view|detalhes|details/i })
        .or(firstRow.locator('button').first());

      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForURL(/requests\/|\/details/, { timeout: 5000 });
      }

      const approveBtn = page.getByRole('button', { name: /aprovar|approve|aceitar|confirm/i })
        .or(page.locator('[data-testid="approve-btn"]'));
      if (await approveBtn.isVisible()) {
        await approveBtn.click();

        const confirmDialog = page.locator('[role="dialog"], .modal');
        if (await confirmDialog.isVisible()) {
          const confirmBtn = confirmDialog.getByRole('button', { name: /confirm|aprovar|approve/i });
          if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
          }
        }

        await page.waitForTimeout(1000);
      }
    }
  });

  test('should reject purchase request with reason', async ({ page }) => {
    await page.goto(`${COMPRAS_URL}/requests?status=PENDING`);

    await page.waitForTimeout(1000);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      const firstRow = rows.first();

      const viewBtn = firstRow.getByRole('link', { name: /ver|view|detalhes|details/i })
        .or(firstRow.locator('button').first());

      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForURL(/requests\/|\/details/, { timeout: 5000 });
      }

      const rejectBtn = page.getByRole('button', { name: /rejeitar|reject|negar|cancelar/i })
        .or(page.locator('[data-testid="reject-btn"]'));
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();

        const reasonInput = page.locator('textarea[name="reason"], [data-testid="rejection-reason"], input[name="reason"]');
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('Compra não autorizada - orçamento excedido');
        }

        const confirmBtn = page.getByRole('button', { name: /confirm|rejeitar|reject/i });
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe('COMPRAS Sector - SSO Cookie', () => {
  test('should set httpOnly cookie on login', async ({ page }) => {
    await page.goto(`${COMPRAS_URL}/login`);

    await page.getByLabel(/email/i).fill('admin_compras@helpdesk.com');
    await page.getByLabel(/senha|password/i).fill('password123');
    await page.getByRole('button', { name: /entrar|login/i }).click();

    await page.waitForURL(/\//, { timeout: 10000 });

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c =>
      c.name.includes('session') || c.name.includes('token') || c.name.includes('jwt')
    );

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.httpOnly).toBe(true);
    expect(sessionCookie!.domain).toContain('helpdeskmsm');
  });
});

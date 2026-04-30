import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, defaultBrowserType } = config.projects[0].use;

  console.log('Global setup: launching browser for health checks...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const services = [
    { name: 'Backend API', url: process.env.API_URL || 'http://api.helpdeskmsm.local' },
    { name: 'TI Frontend', url: process.env.TI_URL || 'http://ti.helpdeskmsm.local' },
    { name: 'ELECTRIC Frontend', url: process.env.ELECTRIC_URL || 'http://eletrica.helpdeskmsm.local' },
    { name: 'COMPRAS Frontend', url: process.env.COMPRAS_URL || 'http://compras.helpdeskmsm.local' },
  ];

  for (const service of services) {
    try {
      const response = await page.goto(service.url, { timeout: 10000, waitUntil: 'domcontentloaded' });
      if (response && response.ok()) {
        console.log(`✅ ${service.name} is UP`);
      } else {
        console.log(`⚠️  ${service.name} returned ${response?.status()}`);
      }
    } catch (e) {
      console.log(`❌ ${service.name} is DOWN: ${(e as Error).message}`);
    }
  }

  await browser.close();
  console.log('Global setup complete.');
}

export default globalSetup;

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173');
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  // Click Contatos
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('button, a, div');
    const contatos = Array.from(tabs).find(t => t.textContent && t.textContent.includes('Contatos'));
    if (contatos) contatos.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();

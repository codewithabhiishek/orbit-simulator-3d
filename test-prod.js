import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PROD CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PROD ERROR:', err.toString()));
  await page.goto('http://localhost:5001', { waitUntil: 'networkidle0' });
  console.log('Page loaded on 5001');
  const body = await page.$('body');
  const html = await page.evaluate(el => el.innerHTML, body);
  console.log('HTML length:', html.length);
  await browser.close();
})();
node test-prod.js
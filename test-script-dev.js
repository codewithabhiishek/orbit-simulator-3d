import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  console.log('Checking play button on port 3000...');
  try {
    const playBtn = await page.$('#btn-nav-play');
    if (playBtn) {
      console.log('Play button found on port 3000, attempting click.');
      await playBtn.click();
      console.log('Click successful.');
    } else {
      console.log('Play button NOT FOUND on port 3000!');
    }
  } catch (e) {
    console.log('Error clicking play button:', e.message);
  }
  await browser.close();
})();

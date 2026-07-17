import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  await page.goto('http://localhost:5000', { waitUntil: 'networkidle0' });
  console.log('Checking play button...');
  try {
    const playBtn = await page.$('#btn-nav-play');
    if (playBtn) {
      console.log('Play button found, attempting click.');
      await playBtn.click();
      console.log('Click successful.');
    } else {
      console.log('Play button NOT FOUND!');
    }
  } catch (e) {
    console.log('Error clicking play button:', e.message);
  }
  await browser.close();
})();

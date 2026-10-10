const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
 const browser = await chromium.launch();
 const reports = [];
 try {
 for (const slug of await fs.readdir('demos')) {
  const file = path.resolve('demos', slug, 'index.html');
  const out = path.join('screenshots', slug);
  await fs.mkdir(out, {recursive:true});
  const page = await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path:path.join(out,'01-desktop.png')});
  const section = page.locator(slug === 'ags' ? '#services' : '#request');
  await section.screenshot({path:path.join(out,'02-request.png')});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => window.scrollTo(0,0));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)) throw new Error(slug+': mobile overflow');
  await page.screenshot({path:path.join(out,'03-mobile.png')});
  await page.locator('input[name="detail"]').fill('Тестовое пожелание');
  await page.locator('textarea[name="comment"]').fill('Проверка демонстрационной формы');
  await page.locator('button[type="submit"]').click();
  const draft = await page.locator('#draft').innerText();
  if(!draft.includes('не отправлен')) throw new Error(slug+': unsafe form status');
  if(errors.length) throw new Error(errors.join('; '));
  reports.push({slug,screenshots:3,mobileOverflow:false,form:'draft only',visualReview:'pending'});
  await page.close();
 }
 await fs.writeFile('screenshots/checks.json',JSON.stringify(reports,null,2));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});

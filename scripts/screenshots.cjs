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
  const page = await browser.newPage({viewport:{width:1280,height:slug === 'ags' ? 856 : 960},deviceScaleFactor:1,reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path:path.join(out,'01-desktop.png')});
  const selector = slug === 'ags' ? '#services' : slug === 'groomart' ? '#care' : '#request';
  const section = page.locator(selector);
  if (await section.count()) await section.screenshot({path:path.join(out,'02-request.png')});
  else await page.screenshot({path:path.join(out,'02-request.png')});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => window.scrollTo(0,0));
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)) throw new Error(slug+': mobile overflow');
  await page.screenshot({path:path.join(out,'03-mobile.png')});
  let formStatus = 'not present';
  const detail = page.locator('input[name="detail"]');
  const comment = page.locator('textarea[name="comment"]');
  const submit = page.locator('button[type="submit"]');
  if (await detail.count() && await comment.count() && await submit.count()) {
    await detail.fill('Тестовое пожелание');
    await comment.fill('Проверка демонстрационной формы');
    await submit.click();
    const draft = await page.locator('#draft').innerText();
    if(!draft.includes('не отправлен')) throw new Error(slug+': unsafe form status');
    formStatus = 'draft only';
  }
  if(errors.length) throw new Error(errors.join('; '));
  reports.push({slug,screenshots:3,mobileOverflow:false,form:formStatus,visualReview:'pending'});
  await page.close();
 }
 await fs.writeFile('screenshots/checks.json',JSON.stringify(reports,null,2));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {googleLogin}=require('./emulator-google.cjs');
const authIdentity=page=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('firebase:authUser:'));if(!key)return null;const user=JSON.parse(localStorage.getItem(key));return {uid:user.uid,email:user.email,isAnonymous:user.isAnonymous}});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8010');await page.waitForFunction(()=>window.PalsumAccount?.configured);
  await page.locator('[data-account-button]').click();assert.equal(await page.locator('[data-account-action="phone"]').count(),0);
  await page.locator('[data-account-action="google"]').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[data-account-action="google"]').disabled);
  await page.locator('[data-account-action="guest"]').click();await page.locator('.account-modal').waitFor({state:'hidden'});
  const guest=await authIdentity(page);assert.ok(guest?.uid,'Guest identity was created by the app');assert.equal(guest.isAnonymous,true);
  const email=`palsum-browser-${Date.now()}@example.test`;await googleLogin(page,email);
  const upgraded=await authIdentity(page);assert.equal(upgraded.uid,guest.uid);assert.equal(upgraded.isAnonymous,false);assert.equal(upgraded.email,email);
  await page.locator('[data-account-button]').click();await page.locator('[data-account-action="signout"]').click();await page.waitForFunction(()=>document.querySelector('[data-account-button]')?.textContent==='Sign in');
  await googleLogin(page,email);assert.equal((await authIdentity(page)).uid,guest.uid);assert.deepEqual(errors,[]);
  console.log('Browser Auth emulator: Google/guest UI, anonymous creation, Google credential upgrade retaining UID, sign-out and account restoration passed. External Google popup/OAuth is not covered.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const emulator='http://127.0.0.1:9099/emulator/v1/projects/demo-palsum';
const authIdentity=page=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('firebase:authUser:'));if(!key)return null;const user=JSON.parse(localStorage.getItem(key));return {uid:user.uid,phone:user.phoneNumber,isAnonymous:user.isAnonymous}});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8010');await page.waitForFunction(()=>window.PalsumAccount?.configured);

 await page.locator('[data-account-button]').click();await page.locator('[data-account-action="guest"]').click();await page.locator('.account-modal').waitFor({state:'hidden'});
 const guest=await authIdentity(page);assert.ok(guest?.uid,'Guest identity was created by the app');assert.equal(guest.isAnonymous,true);
 await page.locator('[data-account-button]').click();await page.locator('[data-account-action="phone"]').click();
 const phone='+1650'+String(Date.now()).slice(-7);
 await page.locator('#phone-number').fill(phone);await page.locator('#phoneform [type="submit"]').click();await page.locator('#phone-code').waitFor({timeout:20000});
 await page.screenshot({animations:'disabled',path:'/workspace/palsum-phone-demo.png'});
 const codes=await fetch(emulator+'/verificationCodes').then(r=>r.json());const code=codes.verificationCodes.find(c=>c.phoneNumber===phone).code;
 await page.locator('#phone-code').fill(code==='000000'?'999999':'000000');await page.locator('#codeform [type="submit"]').click();await page.waitForFunction(()=>document.getElementById('account-error')?.textContent.includes('did not match'));
 await page.locator('#phone-code').fill(code);await page.locator('#codeform [type="submit"]').click();
 await page.waitForFunction(number=>document.querySelector('[data-account-name]')?.textContent===number,phone);
 const upgraded=await authIdentity(page);assert.equal(upgraded.uid,guest.uid);assert.equal(upgraded.isAnonymous,false);assert.deepEqual(errors,[]);
 console.log('Browser Auth emulator: guest creation, SMS-code UI, wrong-code rejection and phone upgrade retaining the guest UID passed. Firestore persistence is not covered by this suite.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

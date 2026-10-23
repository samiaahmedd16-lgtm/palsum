const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8000');
 await page.locator('[data-action="newHangout"]').click();
 await page.locator('[name="place"]').click();await page.locator('[name="place"]').pressSequentially('Chai squad');
 assert.equal(await page.locator('[name="place"]').inputValue(),'Chai squad');
 await page.locator('.ppaid').nth(0).fill('1200');await page.locator('.pname').nth(1).fill('Sara');
 await page.locator('[data-action="addPerson"]').click();await page.locator('.pname').nth(2).fill('Ali');await page.locator('.ppaid').nth(2).fill('300');
 await page.locator('[type="submit"]').click();await page.locator('.modal h2').filter({hasText:'Chai squad'}).waitFor();assert.match(await page.locator('.modal').innerText(),/Sara pays You/);
 await page.locator('[data-action="editHangout"]').click();await page.locator('[name="place"]').fill('Late night chai');await page.locator('[type="submit"]').click();
 await page.locator('[data-action="shareHangout"]').click();
 await page.locator('[data-action="closeDetails"]').click();await page.locator('#search').click();await page.locator('#search').pressSequentially('Late night');assert.equal(await page.locator('#search').inputValue(),'Late night');assert.equal(await page.locator('.item-card').count(),1);
 await page.locator('#search').fill('nothing');assert.equal(await page.locator('.item-card').count(),0);
 await page.locator('.nav [data-view="budget"]').click();await page.locator('[data-action="editBudget"]').click();await page.locator('#budgetamount').fill('20000');await page.locator('[type="submit"]').click();assert.match(await page.locator('.stat').first().innerText(),/20,000/);
 await page.locator('.nav [data-view="dashboard"]').click();await page.locator('[data-action="newHangout"]').click();await page.locator('.account-modal').waitFor();assert.match(await page.locator('.account-modal').innerText(),/Guests get one hangout/);await page.locator('[data-action="close"]').click();
 await page.locator('.nav [data-view="themes"]').click();await page.locator('button[data-theme="night"]').click();assert.equal(await page.locator('body').getAttribute('data-theme'),'night');await page.reload();assert.equal(await page.locator('body').getAttribute('data-theme'),'night');
 await page.locator('.nav [data-view="themes"]').click();await page.locator('button[data-theme="lavender"]').click();await page.locator('.nav [data-view="dashboard"]').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:`/workspace/palsum-${mobile?'mobile':'desktop'}.png`,fullPage:true});
 assert.deepEqual(errors,[]);console.log(`${mobile?'Mobile':'Desktop'}: typing, create/edit, settlements, sharing, search, budget, guest cap, theme persistence and layout passed`);await context.close();
}await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

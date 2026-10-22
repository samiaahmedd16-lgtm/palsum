const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000');
  await page.evaluate(()=>{const previous=new Date();previous.setDate(1);previous.setMonth(previous.getMonth()-1);const previousDate=`${previous.getFullYear()}-${String(previous.getMonth()+1).padStart(2,'0')}-01`;const fixture={theme:'lavender',budget:12000,plans:[{id:'birthday',place:'Birthday dinner',date:today(),estimate:1500,friends:'Sara'}],hangouts:[{id:'renamed',place:'Chai with Sara',date:today(),people:[{name:'Samia',paid:1200},{name:'Sara',paid:0}]},{id:'old',place:'Last month pizza',date:previousDate,people:[{name:'You',paid:2000},{name:'Sara',paid:0}]}]};localStorage.setItem('palsum.v1',JSON.stringify(fixture))});await page.reload();await page.waitForFunction(()=>!!window.PalsumAccount);
  const spending=page.getByRole('button',{name:'View this month’s spending',exact:true});
  assert.match(await spending.innerText(),/Rs\. 600/);
  await spending.click();assert.equal(await page.locator('h1').innerText(),"This month's spending");assert.equal(await page.locator('.item-card').count(),1);assert.match(await page.locator('.item-card').innerText(),/Rs\. 600\s+Your share/);await page.screenshot({path:`/workspace/palsum-monthly-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  await page.locator('#search').fill('pizza');assert.equal(await page.locator('.item-card').count(),0);
  await page.getByRole('button',{name:'All time',exact:true}).click();assert.equal(await page.locator('.item-card').count(),1);assert.match(await page.locator('.item-card').innerText(),/Last month pizza/);
  await page.locator('.nav [data-view="dashboard"]').click();
  await page.getByRole('button',{name:'View upcoming plans',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('h1').innerText(),'Future plans');
  await page.locator('.nav [data-view="dashboard"]').click();assert.match(await page.getByRole('button',{name:'View upcoming plans',exact:true}).innerText(),/1\s+Rs\. 1,500/);
  await page.evaluate(()=>document.querySelector('.toast')?.remove());await page.screenshot({path:`/workspace/palsum-dashboard-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  await page.getByRole('button',{name:'View upcoming plans',exact:true}).click();assert.match(await page.locator('.item-card').innerText(),/Birthday dinner/);
  await page.locator('.nav [data-view="dashboard"]').click();await spending.click();await page.locator('[data-open="renamed"]').click();await page.locator('[data-action="editHangout"]').click();assert.equal(await page.locator('[name="selfPerson"]').first().isChecked(),true);
  await page.locator('[name="selfPerson"]').nth(1).check();await page.locator('.pname').nth(1).fill('Ayesha');await page.locator('.ppaid').first().fill('100.01');await page.locator('[type="submit"]').click();await page.locator('[data-action="closeDetails"]').click();
  await page.locator('.nav [data-view="dashboard"]').click();assert.match(await spending.innerText(),/Rs\. 50\s/);
  await page.reload();assert.match(await spending.innerText(),/Rs\. 50\s/);
  await page.getByRole('button',{name:'View your monthly budget',exact:true}).click();assert.equal(await page.locator('h1').innerText(),'Fun money');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log(`${mobile?'Mobile':'Desktop'}: dashboard mouse/keyboard shortcuts, monthly search/filter, empty/populated plans, legacy renamed participant, explicit Me selection and cent rounding passed`);
  await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

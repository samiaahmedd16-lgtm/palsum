const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8010';
const {googleLogin}=require('./emulator-google.cjs');
async function saved(page){await page.waitForFunction(()=>document.querySelector('[data-account-status]')?.textContent==='Saved to your account',{},{timeout:25000})}
async function hangout(page,place,paid){
 await page.locator('[data-action="newHangout"]').click();await page.locator('[name="place"]').fill(place);await page.locator('.pname').nth(1).fill('Sara');await page.locator('.ppaid').first().fill(String(paid));await page.locator('#entryform [type="submit"]').click();await page.locator('[data-action="closeDetails"]').click();await saved(page);
}
async function edit(page,{place,paid}={}){
 await page.locator('.nav [data-view="hangouts"]').click();await page.locator('[data-open]').first().click();await page.locator('[data-action="editHangout"]').click();if(place)await page.locator('[name="place"]').fill(place);if(paid)await page.locator('.ppaid').first().fill(String(paid));await page.locator('#entryform [type="submit"]').click();await page.locator('[data-action="closeDetails"]').click();
}
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const contexts=[];const errors=[];
 async function page(){const c=await b.newContext();contexts.push(c);const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(base);await p.waitForFunction(()=>window.PalsumAccount?.configured);return {c,p}}
 const stamp=Date.now();const one=`palsum-cloud-${stamp}@example.test`,two=`palsum-other-${stamp}@example.test`,upgrade=`palsum-upgrade-${stamp}@example.test`;
 const a=await page();await googleLogin(a.p,one);await hangout(a.p,'Cloud chai',1200);
 await a.p.locator('.nav [data-view="plans"]').click();await a.p.locator('[data-action="newPlan"]').click();await a.p.locator('[name="place"]').fill('Cloud dinner');await a.p.locator('[name="estimate"]').fill('1500');await a.p.locator('#entryform [type="submit"]').click();await saved(a.p);
 await a.p.locator('.nav [data-view="budget"]').click();await a.p.locator('[data-action="editBudget"]').click();await a.p.locator('#budgetamount').fill('24000');await a.p.locator('#budgetform [type="submit"]').click();await saved(a.p);
 const other=await page();await googleLogin(other.p,one);assert.deepEqual(await other.p.evaluate(()=>({budget:state.budget,hangouts:state.hangouts.map(h=>h.place),plans:state.plans.map(p=>p.place)})),{budget:24000,hangouts:['Cloud chai'],plans:['Cloud dinner']});
 await edit(other.p,{place:'Updated on another phone'});await saved(other.p);await a.p.waitForFunction(()=>state.hangouts[0]?.place==='Updated on another phone');
 await a.c.setOffline(true);await edit(a.p,{paid:2000});assert.match(await a.p.locator('[data-account-status]').innerText(),/Offline/);await a.c.setOffline(false);await saved(a.p);await other.p.waitForFunction(()=>state.hangouts[0]?.people[0].paid===2000);
 await a.c.setOffline(true);await edit(a.p,{paid:3000});await edit(other.p,{place:'Newer cloud edit'});await saved(other.p);await a.c.setOffline(false);await a.p.waitForFunction(()=>document.querySelector('[data-account-status]')?.textContent.includes('Newer cloud changes'));assert.equal(await a.p.evaluate(()=>state.hangouts[0].people[0].paid),3000);assert.equal(await other.p.evaluate(()=>state.hangouts[0].people[0].paid),2000);
 await a.p.locator('[data-account-button]').click();await a.p.locator('[data-account-action="latest"]').click();await saved(a.p);assert.equal(await a.p.evaluate(()=>state.hangouts[0].place),'Newer cloud edit');
 await a.p.locator('[data-account-button]').click();await a.p.locator('[data-account-action="signout"]').click();await a.p.waitForFunction(()=>document.querySelector('[data-account-button]')?.textContent==='Sign in');await googleLogin(a.p,two);assert.deepEqual(await a.p.evaluate(()=>[state.hangouts.length,state.plans.length]),[0,0]);
 const g=await page();await g.p.locator('[data-account-button]').click();await g.p.locator('[data-account-action="guest"]').click();await saved(g.p);await hangout(g.p,'Guest to keep',800);
 await g.p.locator('[data-action="newHangout"]').click();assert.match(await g.p.locator('.account-modal').innerText(),/Guests get one hangout/);await g.p.locator('[data-action="close"]').click();await googleLogin(g.p,upgrade);assert.equal(await g.p.evaluate(()=>state.hangouts[0]?.place),'Guest to keep');await hangout(g.p,'Second after upgrade',1600);assert.equal(await g.p.evaluate(()=>state.hangouts.length),2);
 assert.deepEqual(errors,[]);console.log('Full Firebase emulator browser workflow passed: private account cloud saving, plans/budget, second-device restore, live updates, offline reconnect, conflict preservation, account isolation and guest upgrade retaining data/unlocking a second hangout.');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLedger,guestWriteError,mergeLedgers,describeAuthError} from '../src/account-policy.js';
const h=id=>({id,place:'Chai',date:'2026-10-22',people:[{name:'You',paid:100}],selfIndex:0});
test('guests get one identity, including after removing it or importing a different backup',()=>{
 const first={...emptyLedger(),hangouts:[h('first')]};
 assert.equal(guestWriteError(first),'');
 assert.equal(guestWriteError({...first,hangouts:[h('first'),h('second')]})!=='',true);
 assert.equal(guestWriteError(emptyLedger(),'first'),'');
 assert.equal(guestWriteError({...first,hangouts:[h('second')]},'first')!=='',true);
 assert.equal(guestWriteError({...first,plans:[{id:'plan'}]},'first')!=='',true);
});
test('bringing device data into an account preserves account preferences and existing IDs',()=>{
 const account={...emptyLedger(),budget:20000,theme:'night',hangouts:[h('same')]};
 const result=mergeLedgers(account,{...emptyLedger(),hangouts:[{...h('same'),place:'old data'},h('new')]});
 assert.equal(result.budget,20000);assert.equal(result.theme,'night');assert.equal(result.hangouts.length,2);assert.equal(result.hangouts[0].place,'Chai');
});
test('auth errors explain Google cancellation, blocked popups and unauthorized domains',()=>{
 assert.match(describeAuthError({code:'auth/popup-closed-by-user'}),/cancelled/);
 assert.match(describeAuthError({code:'auth/popup-blocked'}),/Allow popups/);
 assert.match(describeAuthError({code:'auth/unauthorized-domain'}),/web address/);
});

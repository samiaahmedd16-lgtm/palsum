import test from 'node:test';
import assert from 'node:assert/strict';
import {LedgerSync} from '../src/ledger-sync.js';
import {emptyLedger,clone} from '../src/account-policy.js';
const tick=()=>new Promise(r=>setTimeout(r,0));
function harness(options={}){
 let cached=options.cached||null,remote=options.remote||{data:emptyLedger(),revision:1,guestHangoutId:''};
 const statuses=[],seen=[],saves=[];
 const driver={load:async()=>clone(remote),save:async(data,revision)=>{saves.push({data:clone(data),revision});if(revision!==remote.revision)throw {code:'palsum/conflict'};remote={data:clone(data),revision:revision+1,guestHangoutId:''};return remote},...options.driver};
 const sync=new LedgerSync({driver,cache:{read:()=>cached,write:v=>cached=clone(v)},onData:d=>seen.push(clone(d)),onStatus:s=>statuses.push(s),online:options.online||(()=>true),isEditing:options.isEditing});
 return {sync,driver,statuses,seen,saves,cache:()=>cached,setRemote:v=>remote=v};
}
test('queued writes serialize revisions and keep the latest device draft',async()=>{
 let release;const h=harness();const original=h.driver.save;let calls=0;
 h.driver.save=async(d,r)=>{if(calls++===0)await new Promise(resolve=>release=resolve);return original(d,r)};
 await h.sync.start();h.sync.enqueue({...emptyLedger(),budget:20000});h.sync.enqueue({...emptyLedger(),budget:30000});
 assert.equal(h.cache().pending,true);assert.equal(h.cache().data.budget,30000);release();await tick();await tick();
 assert.deepEqual(h.saves.map(s=>s.revision),[1,2]);assert.equal(h.cache().data.budget,30000);assert.equal(h.cache().pending,false);assert.equal(h.statuses.at(-1),'saved');
});
test('offline changes stay pending and retry after reconnect',async()=>{
 let online=false;const h=harness({online:()=>online});await h.sync.start();h.sync.enqueue({...emptyLedger(),budget:9000});
 assert.equal(h.saves.length,0);assert.equal(h.cache().pending,true);assert.equal(h.statuses.at(-1),'offline');online=true;h.sync.retry();await tick();assert.equal(h.cache().pending,false);
});
test('a remote revision conflict cannot overwrite an unsaved device copy',async()=>{
 const h=harness();await h.sync.start();h.setRemote({revision:2,data:{...emptyLedger(),budget:5000},guestHangoutId:''});h.sync.enqueue({...emptyLedger(),budget:9000});await tick();
 assert.equal(h.statuses.at(-1),'conflict');assert.equal(h.cache().data.budget,9000);assert.equal(h.cache().pending,true);assert.equal(h.sync.blocked,true);
 await h.sync.loadLatest();assert.equal(h.seen.at(-1).budget,5000);assert.equal(h.cache().pending,false);
});
test('restoring an offline draft preserves it when cloud has newer changes',async()=>{
 const h=harness({cached:{revision:1,data:{...emptyLedger(),budget:8000},guestHangoutId:'',pending:true},remote:{revision:2,data:emptyLedger(),guestHangoutId:''}});await h.sync.start();assert.equal(h.seen.at(-1).budget,8000);assert.equal(h.statuses.at(-1),'conflict');assert.equal(h.saves.length,0);
});
test('remote updates do not replace a form while someone is typing',async()=>{
 const h=harness({isEditing:()=>true});await h.sync.start();h.sync.receive({revision:2,data:{...emptyLedger(),budget:5000}});assert.equal(h.statuses.at(-1),'update-available');assert.equal(h.seen.length,1);
});
test('closing an account prevents an old async response from replacing another account',async()=>{
 let resolve;const h=harness({driver:{load:()=>new Promise(r=>resolve=r)}});const start=h.sync.start();h.sync.close();resolve({revision:1,data:{...emptyLedger(),budget:5000}});await start;assert.equal(h.seen.length,0);
});
test('a clean cached copy is refreshed on reconnect without writing old data over the cloud',async()=>{
 const h=harness({cached:{revision:1,data:{...emptyLedger(),budget:8000},pending:false},driver:{load:async()=>{throw {code:'unavailable'}}}});await h.sync.start();assert.equal(h.cache().pending,false);assert.equal(h.sync.pending,null);
 h.driver.load=async()=>({revision:2,data:{...emptyLedger(),budget:18000},guestHangoutId:''});await h.sync.retry();assert.equal(h.seen.at(-1).budget,18000);assert.equal(h.saves.length,0);
});

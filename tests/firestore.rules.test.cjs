const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,deleteDoc,writeBatch,serverTimestamp}=require('firebase/firestore');
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Run this suite through firebase emulators:exec --only firestore --project demo-palsum "npm run test:rules".');
let env;
const member=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'google.com'}}).firestore();
const guest=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).firestore();
const settings=(revision,guestHangoutId='')=>({theme:'lavender',budget:12000,revision,guestHangoutId,updatedAt:serverTimestamp()});
const hangout=id=>({id,place:'Chai',date:'2026-10-22',emoji:'☕',people:[{name:'You',paid:1200},{name:'Sara',paid:0}],selfIndex:0});
function commit(db,uid,{revision=1,used='',ids=[],remove=[]}={}){
 const batch=writeBatch(db);batch.set(doc(db,'users',uid,'settings','main'),settings(revision,used));
 ids.forEach(id=>batch.set(doc(db,'users',uid,'hangouts',id),hangout(id)));
 remove.forEach(id=>batch.delete(doc(db,'users',uid,'hangouts',id)));
 return batch.commit();
}
test.before(async()=>{const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');env=await initializeTestEnvironment({projectId:'demo-palsum',firestore:{host,port:Number(port),rules:fs.readFileSync('firestore.rules','utf8')}})});
test.beforeEach(()=>env.clearFirestore());test.after(()=>env?.cleanup());
test('account data is private to its owner; public and other-account reads fail',async()=>{
 const db=member('alice');await assertSucceeds(commit(db,'alice',{ids:['a','b']}));
 await assertSucceeds(getDoc(doc(db,'users','alice','hangouts','a')));
 await assertFails(getDoc(doc(member('bob'),'users','alice','hangouts','a')));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users','alice','hangouts','a')));
});
test('anonymous account can save and edit one hangout, but cannot add a second',async()=>{
 const db=guest('guest');await assertSucceeds(commit(db,'guest',{used:'first',ids:['first']}));
 await assertSucceeds(commit(db,'guest',{revision:2,used:'first',ids:['first']}));
 await assertFails(commit(db,'guest',{revision:3,used:'second',ids:['second']}));
 await assertFails(commit(db,'guest',{revision:3,used:'first',ids:['second']}));
});
test('guest cannot claim multiple hangouts in its first batch or bypass revision tracking',async()=>{
 const db=guest('guest');await assertFails(commit(db,'guest',{used:'first',ids:['first','second']}));
 await assertFails(setDoc(doc(db,'users','guest','hangouts','first'),hangout('first')));
});
test('deleting a guest hangout or its settings cannot reset the used slot',async()=>{
 const db=guest('guest');await assertSucceeds(commit(db,'guest',{used:'first',ids:['first']}));
 await assertSucceeds(commit(db,'guest',{revision:2,used:'first',remove:['first']}));
 await assertFails(deleteDoc(doc(db,'users','guest','settings','main')));
 await assertFails(commit(db,'guest',{revision:3,used:'second',ids:['second']}));
});
test('guests cannot create future plans; account upgrade unlocks more hangouts',async()=>{
 const db=guest('guest');await assertSucceeds(commit(db,'guest',{used:'first',ids:['first']}));
 const batch=writeBatch(db);batch.set(doc(db,'users','guest','settings','main'),settings(2,'first'));batch.set(doc(db,'users','guest','plans','p'),{id:'p',place:'Dinner',date:'2026-10-23',estimate:1000,friends:'Sara'});await assertFails(batch.commit());
 await assertSucceeds(commit(member('guest'),'guest',{revision:2,used:'first',ids:['second']}));
});
test('stale revisions, invalid budgets and cross-account writes are rejected',async()=>{
 const db=member('alice');await assertSucceeds(commit(db,'alice',{ids:['a']}));
 await assertFails(commit(db,'alice',{revision:1,ids:['b']}));
 await assertFails(setDoc(doc(db,'users','alice','settings','main'),{...settings(2),budget:-1}));
 await assertFails(commit(member('bob'),'alice',{revision:2,ids:['b']}));
});

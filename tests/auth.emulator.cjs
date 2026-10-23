const test=require('node:test');const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase/app');
const {getAuth,connectAuthEmulator,signInAnonymously,linkWithCredential,GoogleAuthProvider,signOut,signInWithCredential}=require('firebase/auth');
test('Auth emulator: upgrade anonymous guest with Google and restore the same account',async()=>{
 const app=initializeApp({apiKey:'demo-key',projectId:'demo-palsum',authDomain:'demo-palsum.firebaseapp.com'},'auth-test-'+Date.now());
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 try{
  const guest=await signInAnonymously(auth);const uid=guest.user.uid;assert.equal(guest.user.isAnonymous,true);
  const stamp=Date.now();const email=`palsum-demo-${stamp}@example.test`;const token=JSON.stringify({sub:'palsum-test-'+stamp,email,email_verified:true,name:'Demo Palsum'});
  const credential=GoogleAuthProvider.credential(token);
  const upgraded=await linkWithCredential(guest.user,credential);assert.equal(upgraded.user.uid,uid);assert.equal(upgraded.user.isAnonymous,false);
  await signOut(auth);const restored=await signInWithCredential(auth,credential);assert.equal(restored.user.uid,uid);assert.equal(restored.user.email,email);
 }finally{await deleteApp(app)}
});

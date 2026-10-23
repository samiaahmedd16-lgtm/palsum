// Demo-provider credentials exercise the real browser Auth/Firestore SDKs without
// loading Google's external popup library. This does not verify live Google OAuth.
const {readdirSync}=require('node:fs');
const {join}=require('node:path');
const sdkFile=readdirSync(join(__dirname,'../.test-build/assets')).find(f=>/^firebase-sdk-.*\.js$/.test(f));
if(!sdkFile)throw new Error('Build the isolated Firebase emulator bundle first.');
async function googleLogin(page,email){
 const upgraded=await page.evaluate(async({sdkPath,email})=>{
  const sdk=await import(sdkPath);const auth=sdk.getAuth();await auth.authStateReady();
  if(auth.app.options.projectId!=='demo-palsum'||auth.emulatorConfig?.port!==9099)throw new Error('Demo sign-in requires the local Auth emulator.');
  const token=JSON.stringify({sub:email,email,email_verified:true,name:'Demo Pal'});
  if(auth.currentUser?.isAnonymous){
   const uid=auth.currentUser.uid;
   const result=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await auth.currentUser.getIdToken(),postBody:new URLSearchParams({id_token:token,providerId:'google.com'}).toString(),requestUri:location.origin,returnSecureToken:true})});
   const linked=await result.json();if(!result.ok)throw new Error(JSON.stringify(linked.error));if(linked.localId!==uid)throw new Error('Guest upgrade changed the user ID.');
   // Install a fresh Google-provider token; the old anonymous refresh token
   // intentionally retains its original sign-in provider.
   await sdk.signInWithCredential(auth,sdk.GoogleAuthProvider.credential(token));return true;
  }
  await sdk.signInWithCredential(auth,sdk.GoogleAuthProvider.credential(token));return false;
 },{sdkPath:'/assets/'+sdkFile,email});
 // A reload also checks that the linked Google account restores from persistence.
 if(upgraded)await page.reload();
 await page.waitForFunction(()=>document.querySelector('[data-account-button]')?.textContent==='Account');
 await page.waitForFunction(()=>document.querySelector('[data-account-status]')?.textContent==='Saved to your account',{},{timeout:25000});
}
module.exports={googleLogin};

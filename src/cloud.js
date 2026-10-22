import {clone,emptyLedger,guestWriteError,mergeLedgers,describeAuthError} from './account-policy.js';
import {LedgerSync} from './ledger-sync.js';
let initializeApp,getAuth,setPersistence,browserLocalPersistence,inMemoryPersistence,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithCredential,linkWithPopup,signInAnonymously,signOut,connectAuthEmulator,getFirestore,connectFirestoreEmulator,createFirebaseDriver;

const ui=window.PalsumUI;
const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
const configured=Object.values(config).every(v=>typeof v==='string'&&v.trim());
const emulator=import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true';
if(emulator&&import.meta.env.MODE!=='test'&&import.meta.env.MODE!=='development')throw new Error('Firebase emulators are not permitted in production builds.');
const statusText={saved:'Saved to your account',saving:'Saving to your account…',offline:'Offline · changes on this device',error:'Not saved yet · retry',conflict:'Newer cloud changes · review', 'update-available':'Update available · review',loading:'Opening your account…',device:'Guest · saved on this device',session:'Guest · session only · export a backup'};
let auth,db,user=null,sync=null,unsubscribe=null,busy=false,sessionGeneration=0,sessionStatus=ui.hasStorage()?'device':'session',ready=!configured;
const initialDevice=read('palsum.v1');const deviceDraft=ui.validData(initialDevice)?initialDevice:clone(ui.getData());
let usedId=read('palsum.guest-used')?.id||deviceDraft.hangouts[0]?.id||'';
if(usedId)write('palsum.guest-used',{id:usedId});
function read(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function currentName(){return user&&!user.isAnonymous?(user.displayName||user.email||'Your account'):'Guest hangout'}
function isMember(){return !!user&&!user.isAnonymous}
function updateChrome(){
  document.querySelectorAll('[data-account-status]').forEach(el=>el.textContent=statusText[sessionStatus]||statusText.device);
  document.querySelectorAll('[data-account-name]').forEach(el=>el.textContent=currentName());
  document.querySelectorAll('[data-account-caption]').forEach(el=>el.textContent=isMember()?'Google account':'One hangout · sign in for more');
  document.querySelectorAll('[data-account-button]').forEach(el=>el.textContent=isMember()?'Account':'Sign in');
  document.querySelectorAll('[data-account-action="google"]').forEach(el=>el.disabled=!configured||!auth||busy);
}
function error(message){const node=document.getElementById('account-error');if(node){node.textContent=message;node.hidden=false}else ui.toast(message)}
function message(message){const node=document.getElementById('account-message');if(node){node.textContent=message;node.hidden=false}else ui.toast(message)}
function setBusy(value){busy=value;document.querySelectorAll('[data-account-action="google"]').forEach(el=>el.disabled=value);document.querySelectorAll('[data-account-action="google"]').forEach(el=>el.disabled=value||!configured)}
function dialog(html){ui.openDialog(`<div class="overlay" data-overlay><div class="modal account-modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`);updateChrome()}
function dialogHead(title,subtitle){return `<div class="modal-head"><div><span class="eyebrow">YOUR GOOD TIMES, KEPT SAFE</span><h2>${title}</h2><p>${subtitle}</p></div><button class="close" aria-label="Close dialog" data-action="close">×</button></div>`}
function notices(){return '<p id="account-error" class="account-error" role="alert" hidden></p><p id="account-message" class="notice" role="status" hidden></p>'}
function openAccount(reason=''){
  if(isMember()){
    const localAvailable=ui.validData(deviceDraft)&&(deviceDraft.hangouts.length||deviceDraft.plans.length);
    dialog(`${dialogHead('Your ledger, wherever you go',ui.escape(currentName()))}<div class="account-cloud"><span class="account-cloud-icon">☁</span><strong>${statusText[sessionStatus]}</strong><p>Hangouts, plans, budget and theme belong to this account. Sign in with the same account on another device to load them.</p></div>${notices()}<div class="account-stack"><button class="btn secondary" data-account-action="retry">Retry saving</button><button class="btn secondary" data-account-action="latest">Load latest cloud copy</button><button class="btn secondary" data-action="export">Download a backup</button>${localAvailable?'<button class="btn ghost" data-account-action="import-device">Bring my device hangouts into this account</button>':''}<button class="btn danger" data-account-action="signout">Sign out</button></div>`);
    return;
  }
  dialog(`${dialogHead('Keep the memories.<br>Keep the receipts.',reason||'One account. Your hangouts on every device.')}<div class="account-perks"><span>✓ Cloud-saved history</span><span>✓ More hangouts</span><span>✓ Pick up on another phone</span></div>${!configured?'<p class="notice">Account sign-in is being set up. You can still try one hangout as a guest and export a backup.</p>':''}${notices()}<div class="account-stack"><button class="btn google-button" data-account-action="google" ${configured?'':'disabled'}><span aria-hidden="true">G</span> Continue with Google</button><div class="account-or"><span>or take it for a spin</span></div><button class="btn ghost" data-account-action="guest">Continue as guest · 1 hangout</button></div><p class="explain account-footnote">Guest access is limited to one hangout per guest account. Sign in to save more and use future plans. Guest access stays tied to this browser. Sign in before switching phones or clearing browser data. Existing device data stays here until you choose to import it.</p>`);
}
function stashGuest(){if(user?.isAnonymous){const draft=ui.getData();if(ui.validData(draft)){Object.assign(deviceDraft,clone(draft));write('palsum.v1',draft)}}}
async function googleSignIn(){
  if(!configured||busy)return;setBusy(true);
  stashGuest();const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  try{
    if(user?.isAnonymous){
      try{await linkWithPopup(user,provider);await user.getIdToken(true);await openSession(user)}catch(e){
        if(e.code!=='auth/credential-already-in-use'&&e.code!=='auth/email-already-in-use')throw e;
        const credential=GoogleAuthProvider.credentialFromError(e);if(!credential)throw e;await signInWithCredential(auth,credential);
      }
    }else await signInWithPopup(auth,provider);
    ui.closeDialog();ui.toast('Signed in. Your ledger is opening.');
  }catch(e){error(describeAuthError(e))}finally{setBusy(false)}
}
function localSave(data){
  const stored=read('palsum.v1');const previous=ui.validData(stored)?stored:deviceDraft;
  // Preserve older, larger device ledgers for migration, but don't let guests add more.
  const legacy=(previous.hangouts.length>1||previous.plans.length>0)&&data.hangouts.every(h=>previous.hangouts.some(p=>p.id===h.id))&&data.plans.every(h=>previous.plans.some(p=>p.id===h.id));
  const reason=legacy?'':guestWriteError(data,usedId);
  if(reason)return reason;
  if(!usedId&&data.hangouts.length){usedId=data.hangouts[0].id;write('palsum.guest-used',{id:usedId})}
  const saved=write('palsum.v1',data);Object.assign(deviceDraft,clone(data));
  sessionStatus=saved?'device':'session';updateChrome();if(!saved)ui.toast('Browser storage is unavailable. Export a backup before leaving.');return '';
}
function cacheFor(uid){const key='palsum.account.'+uid;return {
  read(){const cached=read(key);return cached&&ui.validData(cached.data)?cached:null},
  write(value){if(!write(key,value))ui.toast('Could not keep an offline copy on this device. Keep this page open until cloud saving completes.')}
}}
async function openSession(nextUser){
  const previousUser=user;const token=++sessionGeneration;sync?.close();unsubscribe?.();unsubscribe=null;sync=null;user=nextUser;ready=false;
  if(!user){ready=true;sessionStatus=ui.hasStorage()?'device':'session';if(previousUser)ui.replaceData(read('palsum.v1')||deviceDraft);updateChrome();return}
  sessionStatus='loading';updateChrome();
  const uid=user.uid;
  // An unrelated Google account always starts from its own cloud record.
  const stored=read('palsum.v1');const local=ui.validData(stored)?stored:deviceDraft;
  const fallback=user.isAnonymous&&!guestWriteError(local,usedId)?local:emptyLedger();
  const driver=createFirebaseDriver(db,user,ui.validData);
  const current=new LedgerSync({driver,cache:cacheFor(uid),isEditing:ui.isEditing,onData:data=>{if(token===sessionGeneration)ui.replaceData(data)},onStatus:status=>{if(token===sessionGeneration){sessionStatus=status;updateChrome()}}});
  sync=current;await current.start(fallback);
  if(token!==sessionGeneration)return;
  ready=true;
  unsubscribe=driver.watch(record=>current.receive(record),()=>{if(token===sessionGeneration){sessionStatus=navigator.onLine?'error':'offline';updateChrome()}});
  updateChrome();
}
window.PalsumAccount={
  configured,
  afterRender:updateChrome,
  canCreate(type){return ready&&(isMember()||(type==='hangout'&&!usedId&&!sync?.usedId&&ui.getData().hangouts.length===0))},
  reason(){return !ready?'Your account is still opening. Please wait a moment.':'Guests get one hangout. Sign in to save more.'},
  open:openAccount,
  save(data){
    if(!ready)return 'Your account is still opening. Please wait a moment.';
    if(!user)return localSave(data);
    if(user.isAnonymous){const reason=guestWriteError(data,sync?.usedId||usedId);if(reason)return reason;if(!usedId&&data.hangouts.length){usedId=data.hangouts[0].id;write('palsum.guest-used',{id:usedId})}}
    sync.enqueue(data);return '';
  }
};
document.addEventListener('click',async event=>{
  const action=event.target.closest('[data-account-action]')?.dataset.accountAction;if(!action||busy)return;
  if(action==='account')openAccount();
  if(action==='google')await googleSignIn();
  if(action==='guest'){
    if(configured&&!user){setBusy(true);try{await signInAnonymously(auth);ui.closeDialog()}catch(e){error(describeAuthError(e))}finally{setBusy(false)}}else ui.closeDialog();
  }
  if(action==='retry'){sync?.retry();message('Trying to save your device changes.');}
  if(action==='latest'){
    if(!confirm('Load the latest cloud copy? Export a backup first if you want to keep unsaved changes on this device.'))return;
    try{await sync?.loadLatest();ui.closeDialog()}catch{error('Could not load your account. Check your connection and try again.')}
  }
  if(action==='import-device'){
    const next=mergeLedgers(ui.getData(),deviceDraft);
    if(!ui.validData(next))return error('The device backup could not be imported. Export it for safekeeping.');
    if(!confirm(`Add ${deviceDraft.hangouts.length} device hangout(s) and ${deviceDraft.plans.length} plan(s) to this account? Account budget and theme will be kept.`))return;
    ui.replaceData(next);sync.enqueue(next);ui.closeDialog();ui.toast('Device entries added. Saving to your account.');
  }
  if(action==='signout'){
    const keepDraft=!!(sync?.pending||sync?.running||sync?.blocked);
    if(keepDraft&&!confirm('Some changes have not saved to your account. A draft will remain on this device for this account; sign in here again to recover it. Export a backup first if you need a separate copy. Sign out anyway?'))return;
    setBusy(true);
    try{const oldUid=user.uid;await signOut(auth);if(!keepDraft)try{localStorage.removeItem('palsum.account.'+oldUid)}catch{}ui.closeDialog();ui.toast('Signed out.')}catch(e){error(describeAuthError(e))}finally{setBusy(false)}
  }
});
window.addEventListener('online',()=>sync?.retry());
window.addEventListener('offline',()=>{if(user){sessionStatus='offline';updateChrome()}});
window.addEventListener('beforeunload',event=>{if(sync?.pending||sync?.running){event.preventDefault();event.returnValue=''}});
window.addEventListener('palsum:render',updateChrome);
updateChrome();
if(configured){
  try{
    const [sdk,driver]=await Promise.all([import('./firebase-sdk.js'),import('./firebase-driver.js')]);
    ({initializeApp,getAuth,setPersistence,browserLocalPersistence,inMemoryPersistence,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signInWithCredential,linkWithPopup,signInAnonymously,signOut,connectAuthEmulator,getFirestore,connectFirestoreEmulator}=sdk);createFirebaseDriver=driver.createFirebaseDriver;
    const app=initializeApp(config);auth=getAuth(app);db=getFirestore(app);
    if(emulator){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080)}
    try{await setPersistence(auth,browserLocalPersistence)}catch{await setPersistence(auth,inMemoryPersistence)}
    onAuthStateChanged(auth,nextUser=>void openSession(nextUser),()=>{ready=true;sessionStatus='error';updateChrome()});
  }catch{ready=true;sessionStatus='device';ui.toast('Account saving is unavailable. Your device ledger is still here.');updateChrome()}
}

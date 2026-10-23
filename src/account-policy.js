export const emptyLedger=()=>({theme:'lavender',budget:12000,hangouts:[],plans:[]});
export const clone=value=>JSON.parse(JSON.stringify(value));

// Limit one hangout identity for an anonymous account, including after deletion.
export function guestWriteError(next,usedId=''){
  if(next.plans.length)return 'Sign in to save future plans.';
  if(next.hangouts.length>1)return 'Guests get one hangout. Sign in to keep going.';
  if(next.hangouts.length&&usedId&&next.hangouts[0].id!==usedId)return 'Your guest hangout has been used. Sign in to add another.';
  return '';
}

export function mergeLedgers(account,device){
  const merge=(a,b)=>{const ids=new Set(a.map(x=>x.id));return [...a,...b.filter(x=>!ids.has(x.id))]};
  return {...account,hangouts:merge(account.hangouts,device.hangouts),plans:merge(account.plans,device.plans)};
}

export function describeAuthError(error){
  const messages={
    'auth/popup-closed-by-user':'Sign-in was cancelled. Your hangout is still here.',
    'auth/popup-blocked':'Your browser blocked the sign-in window. Allow popups and try again.',
    'auth/too-many-requests':'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed':'Could not connect. Check your connection and try again.',
    'auth/operation-not-allowed':'This sign-in option is not available yet. You can continue as a guest.',
    'auth/unauthorized-domain':'Sign-in is not available on this web address yet.',
    'auth/account-exists-with-different-credential':'This account uses another sign-in method. Please use the method you originally chose.'
  };
  return messages[error.code]||'Could not sign in. Your device data is safe. Please try again.';
}

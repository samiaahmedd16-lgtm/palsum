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
    'auth/invalid-verification-code':'That code did not match. Check the SMS and try again.',
    'auth/code-expired':'That code expired. Request a fresh code.',
    'auth/too-many-requests':'Too many attempts. Please wait before trying again.',
    'auth/invalid-phone-number':'Enter a phone number with its country code, for example +923001234567.',
    'auth/network-request-failed':'Could not connect. Check your connection and try again.',
    'auth/operation-not-allowed':'This sign-in option is not available yet. You can continue as a guest.',
    'auth/unauthorized-domain':'Sign-in is not available on this web address yet.',
    'auth/captcha-check-failed':'The verification check expired. Please try again.',
    'auth/missing-app-credential':'Please finish the verification check and try again.',
    'auth/quota-exceeded':'Phone verification is temporarily unavailable. Try Google or guest mode.',
    'auth/billing-not-enabled':'Phone verification is not available yet. Try Google or guest mode.',
    'auth/account-exists-with-different-credential':'This account uses another sign-in method. Please use the method you originally chose.'
  };
  return messages[error.code]||'Could not sign in. Your device data is safe. Please try again.';
}

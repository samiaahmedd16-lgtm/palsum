import {collection,doc,getDocFromServer,getDocsFromServer,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore';
import {clone,emptyLedger,guestWriteError} from './account-policy.js';

export function createFirebaseDriver(db,user,validate){
  const root=doc(db,'users',user.uid,'settings','main');
  const hangouts=collection(db,'users',user.uid,'hangouts');
  const plans=collection(db,'users',user.uid,'plans');
  let base=null;
  function readSettings(snapshot){return snapshot.exists()?snapshot.data():null}
  function normalized(h){const index=h.people.findIndex(p=>p.name.trim().toLowerCase()==='you');return {...h,emoji:h.emoji||'☕',selfIndex:Number.isInteger(h.selfIndex)?h.selfIndex:Math.max(0,index)}}
  return {
    async load(){
      for(let attempt=0;attempt<3;attempt++){
        const before=readSettings(await getDocFromServer(root));
        const [hs,ps]=await Promise.all([getDocsFromServer(hangouts),getDocsFromServer(plans)]);
        const after=readSettings(await getDocFromServer(root));
        if((before?.revision||0)!==(after?.revision||0))continue;
        if(!after){base=null;return null}
        const data={theme:after.theme,budget:after.budget,hangouts:hs.docs.map(d=>d.data()),plans:ps.docs.map(d=>d.data())};
        if(!validate(data))throw Object.assign(new Error('Invalid saved data'),{code:'palsum/invalid-data'});
        base={data,revision:after.revision,guestHangoutId:after.guestHangoutId||''};return clone(base);
      }
      throw Object.assign(new Error('Account changed while loading'),{code:'palsum/conflict'});
    },
    async save(data,expectedRevision){
      if(!validate(data))throw Object.assign(new Error('Invalid ledger'),{code:'palsum/invalid-data'});
      if(!base&&expectedRevision)await this.load();
      const previous=base?.data||emptyLedger();
      const result=await runTransaction(db,async transaction=>{
        const snapshot=await transaction.get(root);const current=readSettings(snapshot);const revision=current?.revision||0;
        if(revision!==expectedRevision)throw Object.assign(new Error('Newer changes exist'),{code:'palsum/conflict'});
        let guestHangoutId=current?.guestHangoutId||'';
        if(user.isAnonymous){
          const reason=guestWriteError(data,guestHangoutId);
          if(reason)throw Object.assign(new Error(reason),{code:'palsum/guest-limit'});
          if(!guestHangoutId&&data.hangouts.length)guestHangoutId=data.hangouts[0].id;
        }
        transaction.set(root,{theme:data.theme,budget:data.budget,revision:revision+1,guestHangoutId,updatedAt:serverTimestamp()});
        for(const [key,ref] of [['hangouts',hangouts],['plans',plans]]){
          const old=new Map(previous[key].map(x=>[x.id,x]));const next=new Map(data[key].map(x=>[x.id,key==='hangouts'?normalized(x):x]));
          for(const [id,item] of next)if(JSON.stringify(old.get(id))!==JSON.stringify(item))transaction.set(doc(ref,id),item);
          for(const id of old.keys())if(!next.has(id))transaction.delete(doc(ref,id));
        }
        return {revision:revision+1,guestHangoutId};
      });
      base={...result,data:clone(data)};return result;
    },
    watch(callback,onError){
      let generation=0;
      return onSnapshot(root,{includeMetadataChanges:true},async snapshot=>{
        if(snapshot.metadata.hasPendingWrites||snapshot.metadata.fromCache)return;
        const revision=snapshot.data()?.revision||0;if(!revision)return;
        const token=++generation;
        try{const record=await this.load();if(token===generation&&record)callback(record)}catch(error){onError(error)}
      },onError);
    }
  };
}

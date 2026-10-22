import {clone,emptyLedger} from './account-policy.js';

// One serial writer per account. A revision conflict keeps the device copy intact.
export class LedgerSync {
  constructor({driver,cache,onData,onStatus,isEditing=()=>false,online=()=>navigator.onLine}){
    Object.assign(this,{driver,cache,onData,onStatus,isEditing,online});
    this.revision=0;this.usedId='';this.pending=null;this.running=false;this.closed=false;this.blocked=false;this.observed=null;
  }
  status(value){if(!this.closed){this.state=value;this.onStatus(value)}}
  remember(pending){this.cache.write({data:clone(this.data),revision:this.revision,guestHangoutId:this.usedId,pending})}
  async start(fallback=emptyLedger()){
    const cached=this.cache.read();let remote;
    try{remote=await this.driver.load()}catch(error){
      if(this.closed)return;
      this.data=clone(cached?.data||fallback);this.revision=cached?.revision||0;this.usedId=cached?.guestHangoutId||'';
      this.pending=cached?.pending?clone(this.data):null;this.needsReload=true;this.onData(this.data);this.status(error.code==='unavailable'||!this.online()?'offline':'error');return;
    }
    if(this.closed)return;
    if(cached?.pending){
      this.data=clone(cached.data);this.revision=cached.revision;this.usedId=cached.guestHangoutId||'';this.pending=clone(this.data);this.onData(this.data);
      if((remote?.revision||0)!==this.revision){this.observed=remote;this.blocked=true;this.status('conflict');return}
      this.status('saving');void this.drain();return;
    }
    this.revision=remote?.revision||0;this.usedId=remote?.guestHangoutId||'';
    this.data=clone(remote?.data||fallback);this.onData(this.data);
    if(remote){this.remember(false);this.status('saved')}else this.enqueue(this.data);
  }
  enqueue(data){
    if(this.closed)return;
    this.data=clone(data);this.pending=clone(data);this.remember(true);
    if(this.blocked){this.status('conflict');return}
    this.status(this.online()?'saving':'offline');void this.drain();
  }
  async drain(){
    if(this.running||this.closed||this.blocked||!this.pending||!this.online())return;
    this.running=true;
    try{
      while(this.pending&&!this.closed&&!this.blocked){
        const writing=this.pending;this.pending=null;const revision=this.revision;
        try{
          const result=await this.driver.save(writing,revision);
          if(this.closed)return;
          this.revision=result.revision;this.usedId=result.guestHangoutId||'';this.remember(!!this.pending);
        }catch(error){
          if(this.closed)return;
          this.pending=this.pending||writing;this.remember(true);
          this.blocked=error.code==='palsum/conflict';
          this.status(this.blocked?'conflict':error.code==='unavailable'||!this.online()?'offline':'error');return;
        }
      }
      if(!this.closed)this.status('saved');
    }finally{
      this.running=false;
      if(!this.closed&&this.observed?.revision>this.revision)this.receive(this.observed);
    }
  }
  receive(remote){
    if(this.closed||!remote)return;
    if(this.needsReload&&!this.pending){this.applyRemote(remote);return}
    if(remote.revision<=this.revision)return;
    this.observed=remote;
    if(this.running)return;
    if(this.pending){this.blocked=true;this.status('conflict');return}
    if(this.isEditing()){this.status('update-available');return}
    this.applyRemote(remote);
  }
  applyRemote(remote){
    this.needsReload=false;this.pending=null;this.blocked=false;this.observed=null;this.revision=remote?.revision||0;this.usedId=remote?.guestHangoutId||'';this.data=clone(remote?.data||emptyLedger());this.remember(false);this.onData(this.data);this.status('saved');
  }
  async loadLatest(){const remote=await this.driver.load();if(!this.closed)this.applyRemote(remote)}
  async retry(){
    if(this.closed||this.blocked||!this.online())return;
    if(this.needsReload){
      try{const remote=await this.driver.load();if(this.closed)return;this.needsReload=false;if(!this.pending){this.applyRemote(remote);return}if((remote?.revision||0)!==this.revision){this.observed=remote;this.blocked=true;this.status('conflict');return}}catch{this.status('error');return}
    }
    void this.drain();
  }
  close(){this.closed=true;this.pending=null;this.onData=()=>{};this.onStatus=()=>{}}
}

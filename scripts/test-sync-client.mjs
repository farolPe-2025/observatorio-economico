import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/sync.js',import.meta.url),'utf8');
const elements=new Map(),storage=new Map(),cloud=new Map();let authenticated=true,onStateRead=null;
const ctx={console,crypto,Date,JSON,Object,Array,String,Number,RegExp,Promise,URLSearchParams,setTimeout,setInterval:()=>0,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 window:{addEventListener(){}},document:{visibilityState:'visible'},location:{reload(){}},
 $:s=>{if(!elements.has(s))elements.set(s,{hidden:false,textContent:'',innerHTML:''});return elements.get(s)},
 items:[{id:'a',title:'Article'}],ratings:{},saved:{},notes:{},labels:['0','1','2','3','4'],esc:s=>String(s),render(){},toast(){},
 persist(k,v){storage.set(k,JSON.stringify(v));return true},
 async fetch(url,opts){
  if(url.endsWith('status'))return Response.json({configured:true});
  if(!authenticated)return Response.json({error:'login'},{status:401});
  if(opts.method==='POST'){
   const {ops}=JSON.parse(opts.body);const results=ops.map(op=>{let key=op.kind+':'+op.id,r=cloud.get(key);if((r?.revision||0)!==op.baseRev)return {...op,ok:false,revision:r.revision,value:r.value};r={kind:op.kind,id:op.id,value:op.value,revision:(r?.revision||0)+1};cloud.set(key,r);return {...r,opId:op.opId,ok:true}});return Response.json({results});
  }
  const snapshot=[...cloud.values()];if(onStateRead){const hook=onStateRead;onStateRead=null;hook()}return Response.json({entries:snapshot});
 }
};
runInNewContext(source,ctx);
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r))};
await flush();
runInNewContext("ratings.a={value:4,features:[]};queueSync('rating','a')",ctx);await flush();
assert.equal(cloud.get('rating:a').value.value,4);
assert.equal(JSON.parse(storage.get('oe-sync-v1')).pending['rating:a'],undefined);
// A second device writes before this device's next write.
cloud.set('rating:a',{kind:'rating',id:'a',value:{value:2,features:[]},revision:2});
runInNewContext("ratings.a={value:1,features:[]};queueSync('rating','a')",ctx);await flush();
let meta=JSON.parse(storage.get('oe-sync-v1'));assert.equal(meta.conflicts['rating:a'].remote.value,2);assert.equal(meta.conflicts['rating:a'].local.value,1);
assert.equal(cloud.get('rating:a').value.value,2);
assert.equal(elements.get('#syncConflicts').hidden,false);
// Disconnect: local outbox survives, and is retried after reconnect.
authenticated=false;runInNewContext("saved.a=true;queueSync('saved','a')",ctx);await flush();
meta=JSON.parse(storage.get('oe-sync-v1'));assert.equal(meta.pending['saved:a'].value,true);
authenticated=true;runInNewContext('startSync()',ctx);await flush();
assert.equal(cloud.get('saved:a').value,true);
assert.ok(JSON.parse(storage.get('oe-sync-v1')).conflicts['rating:a']);
console.log('PASS: browser outbox, automatic upload, two-device conflict preserves both versions, disconnected retry.');

// An edit arrives while the last server read is still in flight.
onStateRead=()=>runInNewContext("notes.a='edit during refresh';queueSync('note','a')",ctx);
runInNewContext('runSync()',ctx);await flush();
assert.equal(cloud.get('note:a')?.value,'edit during refresh');
assert.equal(Object.keys(JSON.parse(storage.get('oe-sync-v1')).pending).length,0);
console.log('PASS: edits made during refresh upload immediately.');


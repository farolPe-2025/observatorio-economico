
// Editor synchronization: a durable per-field outbox, never a whole-state replacement.
let syncMeta={revisions:{},pending:{},conflicts:{},migrated:false},syncOnline=false,syncBusy=false,syncReady=false;
try{syncMeta={...syncMeta,...JSON.parse(localStorage.getItem('oe-sync-v1')||'{}')}}catch{}
const syncKey=(kind,id)=>kind+':'+id;
function syncStore(){return persist('oe-sync-v1',syncMeta)}
function localValue(kind,id){return kind==='rating'?(ratings[id]||null):kind==='saved'?!!saved[id]:(notes[id]||'')}
function setLocal(kind,id,value){if(kind==='rating'){if(value===null)delete ratings[id];else ratings[id]=value}else if(kind==='saved')saved[id]=!!value;else notes[id]=value||''}
function saveLocalState(){persist('oe-feedback-v1',ratings);persist('oe-saved',saved);persist('oe-notes',notes)}
function syncStatus(message){$('#syncStatus').textContent=message;$('#syncLogin').hidden=syncOnline||!syncReady;$('#syncLogout').hidden=!syncOnline;$('#syncNow').hidden=!syncOnline;$('#migrateLocal').hidden=!syncOnline||syncMeta.migrated;renderConflicts()}
function renderConflicts(){const entries=Object.entries(syncMeta.conflicts);$('#syncConflicts').hidden=!entries.length;$('#syncConflicts').innerHTML=entries.length?'<h4>Revisar alterações em outros dispositivos</h4><p>As duas versões foram preservadas. Escolha qual usar.</p>'+entries.map(([key,c])=>{let i=items.find(i=>i.id===c.id),label=c.kind==='rating'?'Avaliação':c.kind==='saved'?'Favorito':'Anotação';let show=v=>c.kind==='rating'?(v===null?'Sem avaliação':labels[v.value]):c.kind==='saved'?(v?'Guardada':'Não guardada'):String(v||'(vazia)');return '<div class="sync-conflict"><b>'+esc(label+' · '+(i?.title||c.id))+'</b><p>Neste dispositivo: '+esc(show(c.local))+'</p><p>Na nuvem: '+esc(show(c.remote))+'</p><button data-conflict="'+esc(key)+'" data-choice="local">Usar deste dispositivo</button><button data-conflict="'+esc(key)+'" data-choice="remote">Usar da nuvem</button></div>'}).join(''):''}
function queueSync(kind,id){
 const key=syncKey(kind,id),existing=syncMeta.pending[key];
 syncMeta.pending[key]={kind,id,value:localValue(kind,id),baseRev:existing?.baseRev??syncMeta.revisions[key]??0,opId:crypto.randomUUID()};
 delete syncMeta.conflicts[key];
 if(!syncStore()){toast('Não foi possível guardar a fila. Exporte uma cópia antes de fechar esta página.');return}
 syncStatus(syncOnline?'Salvando…':'Pendente · salvo neste dispositivo');
 if(syncOnline)void runSync();
}
async function api(path,body){let r=await fetch('/api/editor/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json','X-OE-Editor':'1'}:{},body:body?JSON.stringify(body):undefined});if(r.status===401){syncOnline=false;throw Error('Entre como editor para sincronizar.')}let b;try{b=await r.json()}catch{throw Error('Sincronização indisponível.')}if(!r.ok)throw Error(b.error||'Falha na sincronização.');return b}
function receiveEntries(entries){
 for(const r of entries){const key=syncKey(r.kind,r.id);syncMeta.revisions[key]=r.revision;
 if(!syncMeta.pending[key]&&!syncMeta.conflicts[key])setLocal(r.kind,r.id,r.value);
 }
 saveLocalState();syncStore();if(items.length)render();
}
async function runSync(){
 if(syncBusy||!syncOnline)return;syncBusy=true;
 try{
 syncStatus('Salvando…');
 while(Object.keys(syncMeta.pending).length){
  const ops=Object.values(syncMeta.pending).slice(0,50),answer=await api('state',{ops});
  for(const r of answer.results){
   const key=syncKey(r.kind,r.id),sent=ops.find(o=>o.opId===r.opId),pending=syncMeta.pending[key];if(!pending||!sent)continue;
   syncMeta.revisions[key]=r.revision;
   if(r.ok){
    if(pending.opId===r.opId)delete syncMeta.pending[key];else pending.baseRev=r.revision;
   }else{
    syncMeta.conflicts[key]={kind:r.kind,id:r.id,local:pending.value,remote:r.value,revision:r.revision};
    delete syncMeta.pending[key];
   }
  }
  syncStore();
 }
 const state=await api('state');receiveEntries(state.entries);
 syncStatus(Object.keys(syncMeta.conflicts).length?'Revisão necessária · versões preservadas':'Sincronizado · '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
 }catch(e){syncStatus('Pendente · '+e.message)}finally{syncBusy=false}
}
async function startSync(){
 try{
  const status=await api('status');syncReady=status.configured;
  if(!syncReady){syncStatus('Sincronização em configuração · dados preservados neste dispositivo');return}
  const state=await api('state');syncOnline=true;
  // First login: preserve the previous browser-only library for explicit migration.
  if(!syncMeta.migrated&&!localStorage.getItem('oe-local-backup-v1')){
   persist('oe-local-backup-v1',{ratings,saved,notes});
  }
  receiveEntries(state.entries);await runSync();
 }catch(e){syncStatus(e.message)}
}
$('#syncNow').onclick=()=>runSync();
$('#syncLogout').onclick=async()=>{try{await api('logout',{});syncOnline=false;syncStatus('Desconectado · cópia local preservada')}catch(e){toast(e.message)}};
$('#migrateLocal').onclick=()=>{
 let backup;try{backup=JSON.parse(localStorage.getItem('oe-local-backup-v1')||'null')}catch{}
 if(!backup){toast('Não há cópia anterior neste navegador. Importe o arquivo exportado no outro computador.');syncMeta.migrated=true;syncStore();return}
 // Existing cloud values require explicit resolution, including previous deletions.
 for(const [kind,map] of [['rating',backup.ratings||{}],['saved',backup.saved||{}],['note',backup.notes||{}]]){
  for(const [id,value] of Object.entries(map)){
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))continue;
   const key=syncKey(kind,id),revision=syncMeta.revisions[key]||0;
   if(revision&&JSON.stringify(localValue(kind,id))!==JSON.stringify(value))syncMeta.conflicts[key]={kind,id,local:value,remote:localValue(kind,id),revision};
   else if(!revision){setLocal(kind,id,value);syncMeta.pending[key]={kind,id,value,baseRev:0,opId:crypto.randomUUID()}}
  }
 }
 syncMeta.migrated=true;saveLocalState();syncStore();render();void runSync();
};
$('#syncConflicts').onclick=e=>{
 const b=e.target.closest('[data-conflict]');if(!b)return;const key=b.dataset.conflict,c=syncMeta.conflicts[key];if(!c)return;
 delete syncMeta.conflicts[key];syncMeta.revisions[key]=c.revision;
 if(b.dataset.choice==='local'){setLocal(c.kind,c.id,c.local);queueSync(c.kind,c.id)}else{setLocal(c.kind,c.id,c.remote);syncStore()}
 saveLocalState();render();syncStatus('Alteração revisada');void runSync();
};
window.addEventListener('online',()=>syncOnline?runSync():startSync());
window.addEventListener('focus',()=>syncOnline?runSync():startSync());
window.addEventListener('storage',e=>{if(e.key==='oe-sync-v1')location.reload()});
setInterval(()=>{if(syncOnline&&document.visibilityState==='visible')void runSync()},60000);
void startSync();

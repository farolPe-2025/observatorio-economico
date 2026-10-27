const ORIGIN='https://observatorio-economico.pages.dev';
const enc=new TextEncoder();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const hash=async s=>b64(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const cookie=(n,v,a)=>n+'='+v+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+a;
const cookies=r=>Object.fromEntries((r.headers.get('Cookie')||'').split(';').map(s=>s.trim().split('=')));
const json=(b,status=200)=>Response.json(b,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const configured=e=>!!(e.DB&&e.GITHUB_CLIENT_ID&&e.GITHUB_CLIENT_SECRET&&e.EDITOR_GITHUB_ID);
const redirect=url=>new Response(null,{status:302,headers:{Location:url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export function cleanValue(kind,v){
 if(v===null)return null;
 if(kind==='saved'){if(typeof v!=='boolean')throw Error();return v}
 if(kind==='note'){if(typeof v!=='string'||v.length>20000)throw Error();return v}
 if(!v||!Number.isInteger(v.value)||v.value<0||v.value>4||!Array.isArray(v.features))throw Error();
 return {id:String(v.id||'').slice(0,100),value:v.value,title:String(v.title||'').slice(0,800),source:String(v.source||'').slice(0,100),topics:(Array.isArray(v.topics)?v.topics:[]).filter(s=>typeof s==='string').slice(0,20),features:v.features.filter(s=>typeof s==='string').map(s=>s.slice(0,200)).slice(0,100),ratedAt:String(v.ratedAt||'').slice(0,40)};
}
export async function onRequest({request,env,params}){
 try{
 const url=new URL(request.url),path=Array.isArray(params.path)?params.path.join('/'):params.path||'';
 if(url.origin!==ORIGIN)return json({error:'Editor disponível apenas no endereço oficial.'},403);
 if(path==='status'&&request.method==='GET')return json({configured:configured(env)});
 if(!configured(env))return json({error:'Sincronização aguardando configuração na Cloudflare.',setup:true},503);
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 if(path==='login'&&request.method==='GET'){
  const state=random(),verifier=random(),target=new URL('https://github.com/login/oauth/authorize');
  for(const [k,v] of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:ORIGIN+'/api/editor/callback',scope:'',state,code_challenge:await hash(verifier),code_challenge_method:'S256',allow_signup:'false',login:'farolPe-2025'}))target.searchParams.set(k,v);
  return new Response(null,{status:302,headers:{Location:target.href,'Cache-Control':'no-store','Set-Cookie':cookie('__Host-oe-oauth',state+'.'+verifier,1800)}});
 }
 if(path==='callback'&&request.method==='GET'){
  const [state,verifier]=(cookies(request)['__Host-oe-oauth']||'').split('.');
  if(!state||!verifier)return redirect('/?editor=login-error&reason=expired');
  if(state!==url.searchParams.get('state'))return redirect('/?editor=login-error&reason=state');
  if(!url.searchParams.get('code'))return redirect('/?editor=login-error&reason=cancelled');
  const response=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),code_verifier:verifier,redirect_uri:ORIGIN+'/api/editor/callback'})});
  const token=await response.json();if(!token.access_token){
   const reason=['incorrect_client_credentials','redirect_uri_mismatch','bad_verification_code','code_verifier_incorrect'].includes(token.error)?token.error:'provider';
   console.warn('OAuth token exchange failed:',reason,response.status);
   return redirect('/?editor=login-error&reason='+reason);
  }
  const ir=await fetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+token.access_token,Accept:'application/vnd.github+json','User-Agent':'Observatorio-Economico'}});
  const identity=await ir.json();
  // Token is discarded after identity verification; repository scopes are never requested.
  if(!ir.ok||String(identity.id)!==String(env.EDITOR_GITHUB_ID))return redirect('/?editor=denied');
  const session=random();
  await db.batch([db.prepare('DELETE FROM editor_sessions WHERE expires_at < ?').bind(Date.now()),db.prepare('INSERT INTO editor_sessions(token_hash,expires_at) VALUES (?,?)').bind(await hash(session),Date.now()+7*86400000)]);
  const headers=new Headers({Location:'/?editor=connected','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  headers.append('Set-Cookie',cookie('__Host-oe-session',session,7*86400));headers.append('Set-Cookie',cookie('__Host-oe-oauth','',0));
  return new Response(null,{status:302,headers});
 }
 if(request.method!=='GET'&&(request.headers.get('Origin')!==ORIGIN||request.headers.get('X-OE-Editor')!=='1'))return json({error:'Origem inválida.'},403);
 const session=cookies(request)['__Host-oe-session'];
 const active=session&&await db.prepare('SELECT expires_at FROM editor_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(session),Date.now()).first();
 if(!active)return json({error:'Entre como editor para sincronizar.'},401);
 if(path==='logout'&&request.method==='POST'){
  await db.prepare('DELETE FROM editor_sessions WHERE token_hash=?').bind(await hash(session)).run();
  return new Response('{}',{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie('__Host-oe-session','',0)}});
 }
 if(path!=='state')return json({error:'Não encontrado.'},404);
 if(request.method==='GET'){
  const {results}=await db.prepare('SELECT kind,item_id,value,revision,updated_at FROM editor_state ORDER BY kind,item_id').all();
  return json({entries:results.map(r=>({kind:r.kind,id:r.item_id,value:JSON.parse(r.value),revision:r.revision,updatedAt:r.updated_at}))});
 }
 if(request.method!=='POST')return json({error:'Método inválido.'},405);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Formato inválido.'},415);
 if(Number(request.headers.get('Content-Length')||0)>300000)return json({error:'Lote muito grande.'},413);
 const text=await request.text();if(text.length>300000)return json({error:'Lote muito grande.'},413);
 const body=JSON.parse(text);if(!Array.isArray(body.ops)||!body.ops.length||body.ops.length>50)return json({error:'Lote inválido.'},400);
 let ops;try{ops=body.ops.map(op=>{
  if(!['rating','saved','note'].includes(op.kind)||!/^[a-zA-Z0-9_-]{1,100}$/.test(op.id)||!/^[a-zA-Z0-9_-]{16,100}$/.test(op.opId)||!Number.isSafeInteger(op.baseRev)||op.baseRev<0)throw Error();
  return {...op,value:cleanValue(op.kind,op.value)};
 })}catch{return json({error:'Alteração inválida.'},400)}
 const results=[];
 for(const op of ops){
  const now=new Date().toISOString();
  if(op.baseRev===0)await db.prepare('INSERT INTO editor_state(kind,item_id,value,revision,last_op,updated_at) VALUES (?,?,?,1,?,?) ON CONFLICT(kind,item_id) DO NOTHING').bind(op.kind,op.id,JSON.stringify(op.value),op.opId,now).run();
  else await db.prepare('UPDATE editor_state SET value=?,revision=revision+1,last_op=?,updated_at=? WHERE kind=? AND item_id=? AND revision=?').bind(JSON.stringify(op.value),op.opId,now,op.kind,op.id,op.baseRev).run();
  const row=await db.prepare('SELECT value,revision,last_op FROM editor_state WHERE kind=? AND item_id=?').bind(op.kind,op.id).first();
  results.push({kind:op.kind,id:op.id,opId:op.opId,ok:row?.last_op===op.opId,revision:row?.revision||0,value:row?JSON.parse(row.value):null});
 }
 return json({results});
 }catch(error){console.error('Editor request failed:',error.name);return json({error:'Não foi possível sincronizar. As alterações locais foram preservadas.'},error instanceof SyntaxError?400:500)}
}

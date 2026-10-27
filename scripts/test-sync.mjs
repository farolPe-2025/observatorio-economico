import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {onRequest} from '../functions/api/editor/[[path]].js';
const sql=new DatabaseSync(':memory:');sql.exec(await readFile(new URL('../migrations/0001_editor.sql',import.meta.url),'utf8'));
const DB={prepare(query){return {bind(...args){const s=sql.prepare(query);return {async first(){return s.get(...args)||null},async all(){return {results:s.all(...args)}},async run(){return {meta:s.run(...args)}}}},async all(){return {results:sql.prepare(query).all()}}}},withSession(){return this}};
const env={DB,GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',EDITOR_GITHUB_ID:'311066321'};
const token='test-session-only';
const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('base64url');
sql.prepare('INSERT INTO editor_sessions VALUES (?,?)').run(digest,Date.now()+60000);
const origin='https://observatorio-economico.pages.dev';
async function req(path,{body,auth=true,originHeader=origin,envOverride=env}={}){
 const headers={'Cookie':auth?'__Host-oe-session='+token:'','Origin':originHeader,'X-OE-Editor':'1','Content-Type':'application/json'};
 return onRequest({request:new Request(origin+'/api/editor/'+path,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined}),env:envOverride,params:{path:[path]}});
}
assert.equal((await req('status',{envOverride:{}})).status,200);
assert.equal((await req('state',{auth:false})).status,401);
assert.equal((await req('state',{body:{ops:[]},originHeader:'https://evil.test'})).status,403);
assert.equal((await req('state',{body:{ops:[{kind:'note',id:'x',baseRev:0,opId:'invalid',value:'text'}]}})).status,400);
async function write(kind,id,value,baseRev,opId=crypto.randomUUID()){
 const r=await req('state',{body:{ops:[{kind,id,value,baseRev,opId}]}});assert.equal(r.status,200);return (await r.json()).results[0];
}
let opId=crypto.randomUUID();
let a=await write('rating','article1',{value:4,features:['t:juros']},0,opId);assert.equal(a.ok,true);assert.equal(a.revision,1);
let retry=await write('rating','article1',{value:4,features:['t:juros']},0,opId);assert.equal(retry.ok,true);assert.equal(retry.revision,1);
let stale=await write('rating','article1',{value:1,features:[]},0);assert.equal(stale.ok,false);assert.equal(stale.value.value,4);
let changed=await write('rating','article1',{value:3,features:[]},1);assert.equal(changed.revision,2);
let removed=await write('rating','article1',null,2);assert.equal(removed.value,null);assert.equal(removed.revision,3);
let resurrection=await write('rating','article1',{value:4,features:[]},1);assert.equal(resurrection.ok,false);assert.equal(resurrection.value,null);
assert.equal((await write('saved','article1',true,0)).ok,true);
assert.equal((await write('note','article1','<script>private note</script>',0)).ok,true);
assert.equal((await req('state',{body:{ops:[{kind:'rating',id:'bad',baseRev:0,opId:crypto.randomUUID(),value:{value:9,features:[]}}]}})).status,400);
let state=await (await req('state')).json();assert.equal(state.entries.length,3);
const login=await req('login');assert.equal(login.status,302);
let authorize=new URL(login.headers.get('Location'));assert.equal(authorize.hostname,'github.com');assert.equal(authorize.searchParams.get('scope'),'');assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
const callback=await req('callback');assert.equal(callback.headers.get('Location'),'/?editor=login-error');
assert.equal((await req('logout',{body:{}})).status,200);assert.equal((await req('state')).status,401);
console.log('PASS: auth, CSRF, validation, identity-only OAuth/PKCE, two-device conflict, idempotent retry, deletion tombstone, private notes, logout.');

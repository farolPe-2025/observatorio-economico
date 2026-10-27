import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/editor/[[path]].js';
const origin='https://observatorio-economico.pages.dev';
let sessionWrite=false;
const env={GITHUB_CLIENT_ID:'fixture-id',GITHUB_CLIENT_SECRET:'fixture-secret',EDITOR_GITHUB_ID:'311066321',DB:{
prepare(query){return {bind(...args){if(query.startsWith('INSERT INTO editor_sessions')){assert.equal(args[0].length,43);sessionWrite=true}return {query,args}}}},
async batch(rows){assert.equal(rows.length,2)}
}};
const call=(path,query='',cookie='')=>onRequest({request:new Request(origin+'/api/editor/'+path+query,{headers:{Cookie:cookie}}),env,params:{path:[path]}});
const login=await call('login');
const cookie=login.headers.get('Set-Cookie').split(';')[0],auth=new URL(login.headers.get('Location'));
const state=auth.searchParams.get('state');
assert.equal((await call('callback','?state=wrong&code=fixture',cookie)).headers.get('Location'),'/?editor=login-error&reason=state');
const originalFetch=globalThis.fetch;
try{
globalThis.fetch=async(url,options)=>{assert.equal(JSON.parse(options.body).code_verifier.length,43);return Response.json({error:'incorrect_client_credentials'})};
assert.equal((await call('callback','?state='+state+'&code=fixture',cookie)).headers.get('Location'),'/?editor=login-error&reason=incorrect_client_credentials');
globalThis.fetch=async(url,options)=>url.includes('access_token')?Response.json({access_token:'fixture-access-token'}):Response.json({id:311066321});
const success=await call('callback','?state='+state+'&code=fixture',cookie);
assert.equal(success.headers.get('Location'),'/?editor=connected');assert.equal(sessionWrite,true);
assert.ok(success.headers.get('Set-Cookie').includes('HttpOnly'));
assert.ok(!success.headers.get('Set-Cookie').includes('fixture-access-token'));
globalThis.fetch=async url=>url.includes('access_token')?Response.json({access_token:'fixture-access-token'}):Response.json({id:999});
assert.equal((await call('callback','?state='+state+'&code=fixture',cookie)).headers.get('Location'),'/?editor=denied');
}finally{globalThis.fetch=originalFetch}
console.log('PASS: OAuth state binding, PKCE verifier, safe credential-error diagnosis, identity verification, hashed session, private cookie.');

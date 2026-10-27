import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {collectionNeeded} from './collection-needed.mjs';
import {mergeManualReferences} from './manual-references.mjs';
const now=new Date('2026-10-27T16:00:00Z');
assert.equal(collectionNeeded({lastCollection:'2026-10-27T10:03:00Z',collectionStatus:'ok'},'schedule',now),false);
assert.equal(collectionNeeded({lastCollection:'2026-10-27T09:59:00Z',collectionStatus:'ok'},'schedule',now),true);
assert.equal(collectionNeeded({lastCollection:'2026-10-26T16:00:00Z',collectionStatus:'ok'},'schedule',now),true);
assert.equal(collectionNeeded({lastCollection:'2026-10-27T10:03:00Z',collectionStatus:'partial'},'schedule',now),true);
assert.equal(collectionNeeded({lastCollection:'2026-10-27T10:03:00Z',collectionStatus:'ok'},'workflow_dispatch',now),true);
const refs=JSON.parse(await readFile(new URL('../data/manual-references.json',import.meta.url),'utf8'));
assert.equal(refs.length,19);
const data={items:[]};assert.equal(mergeManualReferences(data,refs).added,19);
const first=data.items[0];first.id='existing-stable-id';first.url='https://example.org/verified';
assert.equal(mergeManualReferences(data,refs).added,0);assert.equal(data.items[0].id,'existing-stable-id');assert.equal(data.items[0].url,'https://example.org/verified');
assert.equal(new Set(data.items.map(i=>i.id)).size,19);
const full=await readFile(new URL('../public/app.js',import.meta.url),'utf8'),source=full.slice(full.indexOf('let editionLoading=false;'));
const elements=new Map();
function select(value){return {value,options:[{value:'',textContent:'Todos'}],replaceChildren(first){this.options=[first]},append(option){this.options.push(option)}}}
elements.set('#topic',select('Fiscal e tributação'));elements.set('#source',select('Valor Econômico'));
function element(s){if(!elements.has(s))elements.set(s,{textContent:'',disabled:false,classList:{toggle(){},add(){}}});return elements.get(s)}
let next={lastCollection:'2026-10-27T15:40:00Z',collectionStatus:'ok',items:[{id:'one',title:'Fiscal',source:'Valor Econômico',topics:['Fiscal e tributação'],region:'Brasil'}]},fail=false,renders=0;
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-10-27T16:00:00Z']))}}
const ratings={original:{value:4}};
const ctx={$:element,data:undefined,items:[],ratings,Date:FixedDate,Intl,Set,Array,Number,Error,console,world:i=>i.region==='Mundo',render(){renders++},toast(){},setInterval(){},document:{visibilityState:'visible',createElement(){return {value:'',textContent:''}}},window:{addEventListener(){}},async fetch(){if(fail)throw Error('offline');return {ok:true,json:async()=>structuredClone(next)}}};
runInNewContext(source,ctx);
const flush=async()=>{for(let i=0;i<15;i++)await new Promise(r=>setImmediate(r))};
await flush();
assert.equal(elements.get('#topic').value,'Fiscal e tributação');assert.equal(elements.get('#total').textContent,1);assert.equal(ctx.ratings,ratings);
await runInNewContext('refreshEdition()',ctx);
assert.equal(elements.get('#topic').options.length,2);
next={...next,items:[...next.items,{id:'two',title:'Trade',source:'Reuters',topics:['Comércio exterior'],region:'Mundo'}]};
await runInNewContext('refreshEdition()',ctx);
assert.equal(elements.get('#total').textContent,2);assert.equal(elements.get('#worldCount').textContent,1);assert.equal(ctx.ratings.original.value,4);assert.equal(elements.get('#source').value,'Valor Econômico');
fail=true;await runInNewContext('refreshEdition(true)',ctx);
assert.equal(ctx.items.length,2);assert.match(elements.get('#editionFreshness').textContent,/Não foi possível/);
assert.ok(renders>=3);
console.log('PASS: morning retry guard, manual force, partial retry, screenshot-reference deduplication and stable IDs, automatic refresh preserves filters and ratings, offline preserves corpus.');

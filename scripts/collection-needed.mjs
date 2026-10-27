import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const hour=d=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Recife',hour:'2-digit',hourCycle:'h23'}).format(d));
export function collectionNeeded(data,event='schedule',now=new Date()){
 if(event!=='schedule'||data.collectionStatus!=='ok'||!data.lastCollection)return true;
 const last=new Date(data.lastCollection);if(!Number.isFinite(last.getTime()))return true;
 return day(last)!==day(now)||hour(last)<7;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const data=JSON.parse(await fs.readFile(new URL('../public/data.json',import.meta.url),'utf8'));
 console.log('needed='+collectionNeeded(data,process.env.COLLECTION_EVENT||'workflow_dispatch'));
}

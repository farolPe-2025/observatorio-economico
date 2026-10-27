import crypto from 'node:crypto';
export const referenceKey=i=>i.source+'|'+String(i.title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function mergeManualReferences(data,references){
 const known=new Map(data.items.map(i=>[referenceKey(i),i]));let added=0,enriched=0;
 for(const r of references){
  if(!r.title||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Array.isArray(r.topics))throw Error('Referência manual inválida');
  const source=r.source||'Valor Econômico',origin='Referência enviada pelo editor · Valor impresso, '+r.date.split('-').reverse().join('/')+(r.page?', p. '+r.page:'');
  const item={...r,id:crypto.createHash('sha256').update(source+r.title).digest('hex').slice(0,16),source,kind:'noticia',url:null,language:'pt',scope:r.scope||'domestic',region:r.region||'Brasil',origin,titleVerified:true,verification:'user-screenshot',printEdition:r.date,printPage:r.page||null};
  const existing=known.get(referenceKey(item));
  if(existing){existing.printEdition=r.date;existing.printPage=r.page||null;existing.captureOrigin=origin;if(!existing.summary)existing.summary=r.summary;enriched++;continue}
  data.items.push(item);known.set(referenceKey(item),item);added++;
 }
 return {added,enriched};
}

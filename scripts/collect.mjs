import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const file=new URL('../public/data.json',import.meta.url);
const data=JSON.parse(await fs.readFile(file,'utf8'));
const sources=[['Valor Econômico','valor.globo.com'],['O Globo','oglobo.globo.com'],['Poder360','poder360.com.br'],['Diário de Pernambuco','diariodepernambuco.com.br'],['JC','jc.uol.com.br'],['Folha de Pernambuco','folhape.com.br']];
const rules=[['Juros e inflação',/juros|selic|infla|ipca|copom|monet/i],['Fiscal e tributação',/fiscal|tribut|impost|orçamento|orcamento|dívida|fazenda/i],['Indústria e investimentos',/indústr|industr|invest|datacenter|data.center|miner|refinaria/i],['Emprego e renda',/emprego|trabalho|renda|salário|6x1/i],['Crédito e consumo',/crédito|credito|inadimpl|consumo|apostas/i],['Energia e clima',/energia|clima|ambient|carbono|petróleo|el.ni/i],['Comércio e serviços',/comércio|comercio|varejo|serviços|turismo/i],['Educação e desenvolvimento',/educação|saúde|escola|nobel/i]];
const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&');
const text=(xml,tag)=>decode(xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>','i'))?.[1]||'').trim();
const key=i=>i.source+'|'+i.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const seen=new Set(data.items.map(key));let added=0,log=[];
await Promise.all(sources.map(async([source,domain])=>{
 const query='site:'+domain+' (economia OR inflação OR juros OR indústria OR emprego OR Pernambuco OR datacenters OR fiscal) when:3d';
 const url='https://news.google.com/rss/search?q='+encodeURIComponent(query)+'&hl=pt-BR&gl=BR&ceid=BR:pt-419';
 try{let r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'ObservatorioEconomico/1.0 (public news discovery)'}});if(!r.ok)throw Error('HTTP '+r.status);let xml=await r.text();if(!xml.includes('<rss'))throw Error('Resposta não é RSS');
 let count=0;for(let match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){let block=match[1],rawTitle=text(block,'title'),title=rawTitle.replace(/\s+-\s+[^-]+$/,'');let link=text(block,'link'),dateRaw=text(block,'pubDate'),timestamp=Date.parse(dateRaw);if(!title||!link||!Number.isFinite(timestamp)||!link.startsWith('https://news.google.com/'))continue;
 let item={id:crypto.createHash('sha256').update(source+title).digest('hex').slice(0,16),title,url:link,source,date:new Date(timestamp).toISOString().slice(0,10),topics:rules.filter(([_,re])=>re.test(title)).map(([t])=>t),region:/pernambuco|recife|suape|petrolina|caruaru/i.test(title)?'Pernambuco':/nordeste/i.test(title)?'Nordeste':'Brasil e mundo',origin:'Descoberta automática · índice público',titleVerified:true,kind:'noticia',discoveredAt:new Date().toISOString()};
 if(!item.topics.length)continue;if(count>=30)break;let k=key(item);if(!seen.has(k)){data.items.push(item);seen.add(k);added++;count++}}
 log.push({source,status:'ok',added:count});
 }catch(e){log.push({source,status:'error',error:e.message})}
}));
if(!log.some(l=>l.status==='ok'))throw Error('Todas as fontes falharam; acervo preservado. '+JSON.stringify(log));
data.lastCollection=new Date().toISOString();data.generatedAt=data.lastCollection;data.collectionStatus=log.some(l=>l.status==='error')?'partial':'ok';data.collectionLog=log;
await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({added,total:data.items.length,status:data.collectionStatus,sources:log},null,2));

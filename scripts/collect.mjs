import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const file=new URL('../public/data.json',import.meta.url);
const data=JSON.parse(await fs.readFile(file,'utf8'));
const domestic='(economia OR inflação OR juros OR indústria OR emprego OR Pernambuco OR datacenters OR fiscal)';
const globalQuery='(economy OR inflation OR interest rates OR trade OR tariffs OR China OR oil OR commodities OR investment OR monetary policy)';
const sources=[
{name:'Valor Econômico',domain:'valor.globo.com',scope:'domestic',query:domestic,days:3},
{name:'O Globo',domain:'oglobo.globo.com',scope:'domestic',query:domestic,days:3},
{name:'Poder360',domain:'poder360.com.br',scope:'domestic',query:domestic,days:3},
{name:'Diário de Pernambuco',domain:'diariodepernambuco.com.br',scope:'domestic',query:domestic,days:3},
{name:'JC',domain:'jc.uol.com.br',scope:'domestic',query:domestic,days:3},
{name:'Folha de Pernambuco',domain:'folhape.com.br',scope:'domestic',query:domestic,days:3},
{name:'Reuters',domain:'reuters.com',scope:'international',query:globalQuery,days:7},
{name:'Financial Times',domain:'ft.com',scope:'international',query:globalQuery,days:7},
{name:'BBC Business',domain:'bbc.com',scope:'international',query:globalQuery,days:7},
{name:'The Economist',domain:'economist.com',scope:'international',query:globalQuery,days:7},
{name:'FMI',domain:'imf.org',scope:'international',query:'(growth OR inflation OR trade OR spillovers OR emerging markets)',days:14},
{name:'Federal Reserve',domain:'federalreserve.gov',scope:'international',query:'(monetary policy OR interest rates OR inflation OR economic outlook)',days:14},
{name:'BCE',domain:'ecb.europa.eu',scope:'international',query:'(monetary policy OR interest rates OR inflation OR economic outlook)',days:14}
];
const rules=[
['Juros e inflação',/\bjuros|\bselic|\binfla|\bipca|\bcopom|\bmonet|\binterest rates?|\bfederal reserve|\bcentral bank|\becb\b|\btreasur|\bdollar/i],
['Fiscal e tributação',/\bfiscal|\btribut|\bimpost|\borcamento|\bdivida|\bfazenda|\btax\b|\btaxes\b|\bdebt\b|\bdeficit|\bbudget/i],
['Indústria e investimentos',/\bindustr(?:ia|ias|ial|iais)|\binvestimentos?|\binvestidor(?:es)?|\binvestment|\binvestor|\bdata[\s-]?cent(?:er|re)s?|\bminera(?:is|cao)|\bminerio|\brefinaria|\bsemiconductor|\bartificial intelligence/i],
['Emprego e renda',/\bemprego|\bdesemprego|\btrabalho|\brenda|\bsalario|\b6x1|\bemployment|\bunemployment|\bwages?|\blabou?r market/i],
['Crédito e consumo',/\bcredito|\binadimpl|\bconsumo|\bapostas|\bcredit|\bconsumer|\bconsumption|\bhousehold/i],
['Energia e clima',/\benergia|\bclima|\bambient|\bcarbono|\bpetroleo|\bel.ni|\benergy|\boil\b|\bcommodit|\bbrent|\bopec|\bgas\b|\bclimate|\brenewable/i],
['Comércio e serviços',/\bcomercio|\bvarejo|\bservicos|\bturismo|\bretail|\bservices|\btourism/i],
['Comércio exterior',/\bexport|\bimport|\btarif|\btariff|\btrade\b|\bwto\b|\bshipping|\bsupply chain/i],
['Atividade econômica',/\bpib\b|\bcrescimento|\brecessao|\bgdp\b|\bgrowth|\brecession|\beconomy|\beconomic outlook/i],
['Educação e desenvolvimento',/\beducacao|\bensino|\bescolaridade|\balfabetiza|\bevasao escolar|\beducation|\bproductivity|\bnobel.*\beconom/i]
];
const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const decode=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&');
const text=(xml,tag)=>decode(xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>','i'))?.[1]||'').trim();
const key=i=>i.source+'|'+fold(i.title).replace(/[^\p{L}\p{N}]/gu,'');
const seen=new Set(data.items.map(key));let added=0,log=[];
async function collect(source){
 const query='site:'+source.domain+' '+source.query+' when:'+source.days+'d';
 const international=source.scope==='international';
 const url='https://news.google.com/rss/search?q='+encodeURIComponent(query)+(international?'&hl=en-US&gl=US&ceid=US:en':'&hl=pt-BR&gl=BR&ceid=BR:pt-419');
 try{let r=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'User-Agent':'ObservatorioEconomico/2.0 (public headline discovery)'}});if(!r.ok)throw Error('HTTP '+r.status);let xml=await r.text();if(!xml.includes('<rss'))throw Error('Resposta não é RSS');
 let count=0,found=0;
 for(let match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)){let block=match[1],title=text(block,'title'),publisher=text(block,'source');if(publisher&&title.endsWith(' - '+publisher))title=title.slice(0,-publisher.length-3);let link=text(block,'link'),timestamp=Date.parse(text(block,'pubDate'));if(!title||!link||!Number.isFinite(timestamp)||!link.startsWith('https://news.google.com/'))continue;
 if(timestamp>Date.now()+86400000||Date.now()-timestamp>15*86400000)continue;
 let topics=rules.filter(([_,re])=>re.test(fold(title))).map(([t])=>t);if(!topics.length)continue;found++;if(count>=24)break;
 let item={id:crypto.createHash('sha256').update(source.name+title).digest('hex').slice(0,16),title,url:link,source:source.name,date:new Date(timestamp).toISOString().slice(0,10),topics,scope:source.scope,language:international?'en':'pt',region:international?'Mundo':/pernambuco|recife|suape|petrolina|caruaru/i.test(title)?'Pernambuco':/nordeste/i.test(title)?'Nordeste':'Brasil e mundo',origin:'Descoberta automática · índice público',titleVerified:true,kind:'noticia',discoveredAt:new Date().toISOString()};
 let k=key(item);if(!seen.has(k)){data.items.push(item);seen.add(k);added++;count++}}
 log.push({source:source.name,scope:source.scope,status:'ok',matched:found,added:count});
 }catch(e){log.push({source:source.name,scope:source.scope,status:'error',error:e.message})}
}
for(let i=0;i<sources.length;i+=4)await Promise.all(sources.slice(i,i+4).map(collect));
if(!log.some(l=>l.status==='ok'))throw Error('Todas as fontes falharam; acervo preservado. '+JSON.stringify(log));
data.lastCollection=new Date().toISOString();data.generatedAt=data.lastCollection;data.collectionStatus=log.some(l=>l.status==='error')?'partial':'ok';data.collectionLog=log;data.collectorVersion=2;
await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({added,total:data.items.length,international:data.items.filter(i=>i.scope==='international').length,status:data.collectionStatus,sources:log},null,2));

import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const data=JSON.parse(await fs.readFile(new URL('../public/data.json',import.meta.url),'utf8'));
assert(data.items.length>0);const ids=new Set();
for(const i of data.items){assert(i.id&&!ids.has(i.id),'ID duplicado');ids.add(i.id);assert(i.title&&i.source&&Array.isArray(i.topics));if(i.url)assert(['http:','https:'].includes(new URL(i.url).protocol));if(i.date)assert(/^\d{4}-\d{2}-\d{2}$/.test(i.date))}
for(const f of ['index.html','style.css','app.js'])assert((await fs.stat(new URL('../public/'+f,import.meta.url))).size>0);
console.log('Acervo válido: '+data.items.length+' referências, sem IDs duplicados.');

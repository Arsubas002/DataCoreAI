import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { products, sales, customers, categories, analytics, lowStock, exportRows } from '../js/data.js';
import {demoAnswer} from '../js/assistant.js';
test('all 20 SQL references and ten customers retain their original values',()=>{
 const sql=fs.readFileSync(new URL('../../sql/02_datos_prueba.sql',import.meta.url),'utf8');
 const rows=[...sql.matchAll(/\(N'(DEMO-\d+)', N'([^']+)', N'([^']+)', ([\d.]+), (\d+)\)/g)];
 assert.equal(rows.length,20);
 for(const m of rows){const p=products.find(p=>p.code===m[1]);assert.ok(p);assert.deepEqual([p.name,p.category,p.price,p.stock,p.min],[m[2],m[3],+m[4],+m[5],5]);}
 assert.equal(customers.length,10);assert.equal(new Set(customers.map(c=>c.id)).size,10);
 assert.ok(demoAnswer('clientes',analytics()).includes('No se encontró una relación'));
});
test('catalog identifiers, stock states and category coverage do not collide',()=>{
 assert.equal(products.length,32);assert.equal(new Set(products.map(p=>p.id)).size,32);assert.equal(new Set(products.map(p=>p.code)).size,32);
 assert.equal(lowStock.length,11);assert.equal(products.filter(p=>p.stock===0).length,2);
 assert.equal(categories.length,8);
 assert.ok(products.every(p=>Number.isSafeInteger(Math.round(p.price*100))&&p.stock>=0));
 for(const s of sales) {const p=products.find(p=>p.id===s.productId);assert.ok(p);assert.equal(s.totalCents,Math.round(p.price*100)*s.quantity);}
 assert.ok(sales.every(s=>!s.customerId));
 assert.equal(sales.filter(s=>s.productId>=101&&s.productId<=120).length,0);
});
test('seven recovered iOS orders count orders rather than their twelve lines',()=>{
 const d=analytics(7,'Sin asignar');assert.equal(d.orders,7);assert.equal(d.current.length,12);
 assert.equal(d.revenue,1347.7);assert.equal(d.units,23);assert.equal(d.prior.length,0);assert.equal(d.delta,null);
 assert.equal(Math.round(d.ticket*100),19253);
 assert.equal(exportRows(d).length,13);
 assert.ok(d.current.every(s=>s.productId>=201));
});
test('branch totals, CSV, daily series and all categories reconcile for each period',()=>{
 for(const days of [7,30,60]){
 const all=analytics(days);const branches=['Centro','Norte','Sur','Sin asignar'].map(b=>analytics(days,b));
 assert.equal(branches.reduce((a,d)=>a+Math.round(d.revenue*100),0),Math.round(all.revenue*100));
 assert.equal(branches.reduce((a,d)=>a+d.orders,0),all.orders);
 assert.equal(Math.round(all.series.reduce((a,v)=>a+v,0)*100),Math.round(all.revenue*100));
 assert.equal(Math.round(exportRows(all).slice(1).reduce((a,r)=>a+Number(r[5]),0)*100),Math.round(all.revenue*100));
 assert.equal(Math.round(categories.reduce((a,c)=>a+all.ranking.filter(p=>p.category===c).reduce((a,p)=>a+p.revenue,0),0)*100),Math.round(all.revenue*100));
 }
});


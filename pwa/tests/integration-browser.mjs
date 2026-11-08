import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {products, analytics, categories} from '../js/data.js';
const base=process.env.BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
let checks=0;
try{
for(const width of [320,393,768,1440]){
const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const route of ['inicio','productos','ventas','inventario','reportes','asistente']){
await page.goto(base+'/#'+route);await page.locator('#view h1').waitFor();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${route} overflow`);checks++;
if(route==='productos'){
assert.equal(await page.locator('.product').count(),32);
await page.getByRole('button',{name:'Tecnología',exact:true}).click();assert.equal(await page.locator('.product').count(),5);
await page.locator('#global-search').fill('DEMO-020');await page.locator('[data-search-product="120"]').click();assert.match(await page.locator('dialog').textContent(),/Alfombrilla para mouse/);await page.locator('#sheet-close').click();checks++;
}
if(route==='ventas'){
await page.selectOption('#branch','Sin asignar');await page.selectOption('#period','7');
assert.match(await page.locator('.sales-summary').textContent(),/1[,.]347[,.]70/);
await page.locator('details summary').click();assert.equal(await page.locator('details li').count(),10);checks++;
}
if(route==='reportes'){
assert.equal(await page.locator('.category-breakdown-row').count(),categories.length);
assert.match(await page.locator('.report-lead').textContent(),/7 operaciones/);
const downloadPromise=page.waitForEvent('download');await page.locator('#export-csv').click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith('.csv'));checks++;
}
if(route==='asistente'){
await page.locator('#chat-input').fill('clientes');await page.getByRole('button',{name:'Enviar pregunta'}).click();await page.locator('.message.assistant').waitFor();assert.match(await page.locator('.message.assistant').textContent(),/Ana Torres/);checks++;
}
if(process.env.ARTIFACTS_DIR&&[393,1440].includes(width)){
await mkdir(process.env.ARTIFACTS_DIR,{recursive:true});await page.screenshot({path:`${process.env.ARTIFACTS_DIR}/verified-${route}-${width}.png`,fullPage:true});
}
}
assert.deepEqual(errors,[]);await context.close();
}
console.log(`PASS: ${checks} integration browser checks; 320/393/768/1440px, all six sections, original SQL search, customers, unassigned iOS orders, category coverage and CSV download.`);
}finally{await browser.close();}

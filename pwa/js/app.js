import { chatPage as analyst } from './nova-chat.js';
import {source,shops,channels,catalog,categories,transactions,money,num,pct,totals,groupBy} from './novaretail-data.js?v=nova-2025-v1';
import {icon} from './icons.js?v=nova-2025-v1';

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let searchTimeout;
const names={inicio:'Inicio',productos:'Productos',clientes:'Canales',ventas:'Ventas',inventario:'Tiendas',reportes:'Reportes',asistente:'Asistente IA'};
const ids=Object.keys(names);
const state={channel:'Todos',shop:'Todas',category:'Todas',month:'Todos',sort:'net',term:'',page:0,chat:[],draft:'',error:'',pending:null,more:false,whatIf:5};
const months={'2025-01':'Enero','2025-02':'Febrero','2025-03':'Marzo'};
const active=()=>{const slug=(location.hash||'#inicio').slice(1).split('?')[0];return ids.includes(slug)?slug:'inicio'};
const choice=(items,field,caption)=>`<label class="nova-select"><span>${caption}</span><select data-filter="${field}">${items.map(x=>`<option ${state[field]===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
const filters=()=>`<div class="nova-filters" aria-label="Filtros globales">${choice(['Todos',...channels],'channel','Canal')}${choice(['Todas',...shops],'shop','Tienda')}${choice(['Todas',...categories],'category','Categoría')}${choice(['Todos',...Object.values(months)],'month','Mes')}<button class="nova-reset" data-reset-filters="1">Restablecer ${icon('close')}</button></div>`;
const filtered=()=>transactions.filter(r=>(state.channel==='Todos'||r.channel===state.channel)&&(state.shop==='Todas'||r.shop===state.shop)&&(state.category==='Todas'||r.category===state.category)&&(state.month==='Todos'||months[r.date.slice(0,7)]===state.month));
const info=(eyebrow,title,desc)=>`<header class="nova-heading"><div><span class="nova-eyebrow">${eyebrow}</span><h1>${title}</h1><p>${desc}</p></div><span class="nova-period">ENERO — MARZO 2025<br><small>USD · HISTÓRICO</small></span></header>`;
const kpi=(name,value,detail)=>`<div class="nova-kpi"><span class="nova-kpi-label">${esc(name)}</span><div class="nova-kpi-number">${value}</div><small>${esc(detail)}</small></div>`;
const kpis=rows=>{const t=totals(rows);return `<section class="nova-kpis" aria-label="Indicadores principales">${kpi('Ventas netas',money(t.net),'Después de descuentos')}${kpi('Unidades vendidas',num(t.units),'Cantidad histórica')}${kpi('Transacciones',num(t.orders),'Registros del archivo')}${kpi('Descuento total',money(t.discount),'Diferencia frente a ventas brutas')}</section>`};
const share=(n,d)=>d?((100*n/d).toFixed(1)+' %'):'0 %';
const sorted=(rows,metric='net')=>[...rows].sort((a,b)=>b[metric]-a[metric]);
const bars=(rows,metric='net',limit=10)=>{const list=sorted(rows,metric).slice(0,limit),max=Math.max(1,...list.map(x=>x[metric]));if(!list.length)return '<p class="nova-empty">No hay datos para esos filtros.</p>';return `<div class="nova-bars">${list.map((r,i)=>`<div class="nova-bar-row"><div class="nova-bar-top"><span>${esc(r.name)}</span><b>${metric==='net'||metric==='gross'||metric==='discount'?money(r[metric]):num(r[metric])}</b></div><div class="nova-bar-track"><i style="width:${Math.max(0,r[metric]*100/max).toFixed(2)}%;--bar-index:${i}"></i></div></div>`).join('')}</div>`};
const donut=(rows,metric='net')=>{const list=sorted(rows,metric).filter(x=>x[metric]>0),total=list.reduce((s,r)=>s+r[metric],0);if(!total)return '<p class="nova-empty">No hay datos para esos filtros.</p>';const cs=['var(--chart)','var(--violet)','#edaa6d'];let start=0;const parts=list.map((r,i)=>{const end=start+r[metric]*100/total,chunk=`${cs[i%cs.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`;start=end;return chunk});return `<div class="nova-donut-wrap"><div class="nova-donut" style="background:conic-gradient(${parts.join(',')})" role="img" aria-label="Distribución de ventas por canal"><div><strong>${num(list.length)}</strong><span>segmentos</span></div></div><div class="nova-donut-legend">${list.map((r,i)=>`<div><i style="background:${cs[i%cs.length]}"></i><span>${esc(r.name)}</span><strong>${share(r[metric],total)}</strong></div>`).join('')}</div></div>`};
function line(records) {
  const days = groupBy(records, r => r.date).sort((a, b) => a.name.localeCompare(b.name));
  if (days.length < 2) return '<p class="nova-empty">Se necesitan al menos dos días para representar una tendencia.</p>';

  const width = 720;
  const height = 220;
  const left = 53;
  const right = width - 24;
  const bottom = height - 27;
  const max = Math.ceil(Math.max(...days.map(day => day.net), 1) / 400000) * 400000;
  const first = Date.parse(days[0].name);
  const last = Date.parse(days.at(-1).name);
  const x = date => left + (Date.parse(date) - first) / (last - first) * (right - left);
  const y = value => bottom - value / max * (bottom - 16);
  const path = days.map((day, index) => `${index ? 'L' : 'M'}${x(day.name).toFixed(2)},${y(day.net).toFixed(2)}`).join(' ');
  const area = `${path} L${right},${bottom} H${left} Z`;
  const ticks = [...new Set([0, 1, 2, 3, 4].map(step => Math.round(step * (days.length - 1) / 4)))];
  const dateLabel = date => date.slice(5).split('-').reverse().join('/');
  return `<div class="nova-line-scroll" tabindex="0" role="region" aria-label="Gráfica de ventas diarias"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de ventas netas por día con registros, en dólares">
    <defs><linearGradient id="nova-graph-fill" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0" stop-color="var(--chart)" stop-opacity=".32"/><stop offset="1" stop-color="var(--chart)" stop-opacity="0"/></linearGradient></defs>
    ${[0, .25, .5, .75, 1].map(fraction => {
      const value = max * fraction;
      const pos = y(value);
      return `<line x1="${left}" x2="${right}" y1="${pos}" y2="${pos}" stroke="var(--line)"/><text x="${left - 9}" y="${pos + 4}" text-anchor="end" fill="currentColor">${value ? '$' + num(value / 100000) + 'k' : '$0'}</text>`;
    }).join('')}
    <path d="${area}" fill="url(#nova-graph-fill)"/>
    <path d="${path}" fill="none" stroke="var(--chart)" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
    ${ticks.map(index => `<text x="${x(days[index].name)}" y="${height - 5}" text-anchor="middle" fill="currentColor">${dateLabel(days[index].name)}</text>`).join('')}
  </svg></div>`;
}
const section=(title,sub,body)=>`<section class="nova-panel"><div class="nova-panel-head"><div><h2>${title}</h2><p>${sub}</p></div></div>${body}</section>`;
const badge=word=>`<span class="nova-tag">${esc(word)}</span>`;
const callout=(title,description)=>`<section class="nova-callout"><span class="nova-eyebrow">ORIGEN DE DATOS</span><strong>${esc(title)}</strong><p>${esc(description)}</p></section>`;
const trendMonth=r=>`<div class="nova-months">${['2025-01','2025-02','2025-03'].map(m=>{const t=totals(r.filter(a=>a.date.startsWith(m)));return `<div><span>${months[m]}</span><strong>${money(t.net)}</strong><small>${num(t.orders)} transacciones</small></div>`}).join('')}</div>`;

function home() {
  const rows = filtered();
  const t = totals(rows);
  const channelTotals = sorted(groupBy(rows, r => r.channel));
  const storeTotals = sorted(groupBy(rows, r => r.shop));
  return `${info('NOVA RETAIL', 'Resumen de ventas', 'Consulta el rendimiento comercial por canal, tienda y producto.')}
    ${filters()}
    <div class="nova-dashboard">
      <section class="nova-panel nova-sales-overview">
        <div class="nova-panel-head">
          <div>
            <h2>Evolución diaria</h2>
            <p>Ventas netas · USD</p>
          </div>
          <a class="nova-secondary" href="#reportes">Ver reportes ${icon('arrow')}</a>
        </div>
        <div class="nova-hero-number">${money(t.net)}</div>
        ${line(rows)}
        ${trendMonth(rows)}
      </section>
      <section class="nova-dashboard-metrics" aria-label="Indicadores principales">
        ${kpi('Unidades vendidas', num(t.units), 'Cantidad histórica')}
        ${kpi('Transacciones', num(t.orders), 'Registros del archivo')}
        ${kpi('Descuento total', money(t.discount), 'Diferencia frente a ventas brutas')}
      </section>
    </div>
    <div class="nova-two">
      ${section('Ventas por canal', 'Participación en la facturación neta', donut(channelTotals))}
      ${section('Ventas por tienda', 'Facturación neta · USD', bars(storeTotals))}
    </div>
    ${callout('Cobertura de la fuente', 'El archivo contiene transacciones, precios y descuentos históricos. No incluye existencias ni costos.')}`;
}
function productsPage(){const rows=filtered(),products=sorted(groupBy(rows,r=>r.product));const sc=state.sort;products.sort((a,b)=>sc==='units'?b.units-a.units:sc==='name'?a.name.localeCompare(b.name,'es'):b.net-a.net);return `${info('NOVA RETAIL / CATÁLOGO COMERCIAL','Productos','Doce referencias con sus ventas, unidades y descuentos históricos. No se muestran existencias disponibles.')}${filters()}<section class="nova-toolbar-line"><strong>${products.length} productos</strong><label class="nova-select"><span>Ordenar por</span><select id="nova-sort"><option value="net" ${sc==='net'?'selected':''}>Facturación neta</option><option value="units" ${sc==='units'?'selected':''}>Unidades</option><option value="name" ${sc==='name'?'selected':''}>Nombre</option></select></label></section><div class="nova-products">${products.map(r=>{const p=catalog.find(x=>x.name===r.name);return `<article class="nova-product"><div class="nova-product-top">${badge(p?.category||'')}</div><h2>${esc(r.name)}</h2><p>${esc(p?.segment||'')} · precio unitario ${money(Math.round((p?.price||0)*100))}</p><div class="nova-product-metrics"><div><span>Ventas netas</span><strong>${money(r.net)}</strong></div><div><span>Unidades vendidas</span><strong>${num(r.units)}</strong></div></div><div class="nova-product-footer"><span>${num(r.orders)} operaciones</span><a href="#ventas" data-product-link="${esc(r.name)}">Ver ventas ${icon('arrow')}</a></div></article>`}).join('')}</div>${callout('La demanda no equivale al inventario','Una cantidad vendida indica movimiento comercial histórico; no confirma unidades disponibles para una compra futura.')}`}
function channelsPage(){const rows=filtered(),groups=sorted(groupBy(rows,r=>r.channel)),t=totals(rows);return `${info('NOVA RETAIL / OMNICANAL','Ventas por canal','Comparación entre tienda física, comercio online y aplicación móvil.')}${filters()}${kpis(rows)}<div class="nova-channel-grid">${groups.map(r=>`<article class="nova-channel-card"><h2>${esc(r.name)}</h2><strong>${money(r.net)}</strong><p>${share(r.net,t.net)} de la facturación neta</p><div class="nova-channel-stat"><span>${num(r.units)} unidades</span><span>${num(r.orders)} ventas</span></div></article>`).join('')}</div><div class="nova-two">${section('Participación por canal','Reparto de la facturación neta',donut(groups))}${section('Volumen por canal','Cantidad total de unidades vendidas',bars(groups,'units'))}</div>`}
const csvSafe=v=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"'};
function download(){const records=filtered().filter(r=>!state.term||normalize([r.id,r.product,r.category,r.shop,r.channel,r.date].join(' ')).includes(normalize(state.term)));const hdr=['ID_Venta','Fecha','Tienda','Canal','Categoria','Producto','Cantidad','Precio_Unitario_USD','Descuento','Ventas_Brutas_USD','Total_Descontado_USD','Ventas_Netas_USD'];const values=records.map(r=>[r.id,r.date,r.shop,r.channel,r.category,r.product,r.quantity,r.price,r.discount.toFixed(2),(r.gross/100).toFixed(2),(r.discountCents/100).toFixed(2),(r.net/100).toFixed(2)]);const body=[hdr,...values].map(row=>row.map(csvSafe).join(',')).join('\r\n');const blob=new Blob(['\uFEFF'+body],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='NovaRetail_ventas_filtradas_2025.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function salesPage(){const all=filtered(),query=normalize(state.term.trim()),rows=all.filter(r=>!query||normalize([r.id,r.date,r.product,r.category,r.shop,r.channel].join(' ')).includes(query)).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)),perPage=30,maxPage=Math.max(0,Math.ceil(rows.length/perPage)-1);state.page=Math.min(state.page,maxPage);const subset=rows.slice(state.page*perPage,(state.page+1)*perPage);return `${info('NOVA RETAIL / REGISTROS REALES','Historial de ventas','Explora los 1,671 registros de ventas del archivo y exporta la selección.')}${filters()}<section class="nova-panel"><div class="nova-sales-actions"><label class="nova-search-table">Buscar transacción<input id="sales-search" type="search" value="${esc(state.term)}" placeholder="Código, producto, tienda..." autocomplete="off"></label><button class="nova-cta" id="download-rows">${icon('down')} Exportar CSV</button></div><div class="nova-sale-summary"><span>${num(rows.length)} transacciones filtradas</span><strong>${money(totals(rows).net)}</strong></div><div class="nova-table-scroll" tabindex="0" role="region" aria-label="Tabla de datos"><table class="nova-table"><thead><tr><th>ID</th><th>Fecha</th><th>Producto</th><th>Tienda</th><th>Canal</th><th>Uds.</th><th>Descuento</th><th>Venta neta</th></tr></thead><tbody>${subset.map(r=>`<tr><td><strong>${r.id}</strong></td><td>${r.date}</td><td>${esc(r.product)}</td><td>${esc(r.shop)}</td><td>${esc(r.channel)}</td><td>${r.quantity}</td><td>${pct(r.discount)}</td><td class="nova-cell-money">${money(r.net)}</td></tr>`).join('')}</tbody></table></div><div class="nova-pager"><span>Página ${state.page+1} de ${maxPage+1}</span><div><button data-page="-1" ${state.page===0?'disabled':''}>Anterior</button><button data-page="1" ${state.page>=maxPage?'disabled':''}>Siguiente</button></div></div></section>${callout('Descuentos atípicos','La auditoría del archivo utiliza el umbral >15 %. Se observan descuentos de 0 %, 5 %, 10 % y 15 %; no hay operaciones que lo superen.')}`}
function storesPage(){const rows=filtered(),stores=sorted(groupBy(rows,r=>r.shop)),channelByStore=shops.map(shop=>({shop,values:channels.map(channel=>totals(rows.filter(r=>r.shop===shop&&r.channel===channel)).net)}));return `${info('NOVA RETAIL / RED DE TIENDAS','Rendimiento por tienda','Rendimiento de Centro, Este, Norte y Sur en los tres canales de venta.')}${filters()}<div class="nova-store-list">${stores.map(r=>`<article class="nova-store"><h2>${esc(r.name)}</h2><strong>${money(r.net)}</strong><p>${num(r.units)} unidades · ${num(r.orders)} transacciones</p></article>`).join('')}</div>${section('Ventas por tienda y canal','Matriz de ventas netas en dólares',`<div class="nova-table-scroll" tabindex="0" role="region" aria-label="Tabla de datos"><table class="nova-table nova-matrix"><thead><tr><th>Tienda</th>${channels.map(x=>`<th>${esc(x)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${channelByStore.map(r=>`<tr><td><strong>${esc(r.shop)}</strong></td>${r.values.map(n=>`<td>${money(n)}</td>`).join('')}<td><strong>${money(r.values.reduce((a,b)=>a+b,0))}</strong></td></tr>`).join('')}</tbody></table></div>`)}`}
function reportsPage(){const rows=filtered(),t=totals(rows),category=sorted(groupBy(rows,r=>r.category)),product=sorted(groupBy(rows,r=>r.product)),discountAudit=rows.filter(r=>r.discount>.15),moda=rows.filter(r=>r.category==='Moda'&&r.discount===.15),uplift=moda.reduce((v,r)=>v+r.gross*(.15-state.whatIf/100),0);return `${info('NOVA RETAIL / INFORME','Reportes comerciales','Análisis comercial basado en los datos de 2025, con comparaciones y escenarios transparentes.')}${filters()}${kpis(rows)}<div class="nova-two">${section('Ingresos por categoría','Ventas netas USD',bars(category))}${section('Productos líderes','Top 8 por unidades vendidas',bars(product,'units',8))}</div>${section('Tendencia comercial','Ventas netas diarias',line(rows))}<section class="nova-panel nova-scenario"><div><h2>¿Y si se redujera un descuento?</h2><p>Simulación sobre ventas de Moda con 15 % de descuento. Mantiene cantidad y precio; no proyecta demanda, costos ni margen.</p><label for="whatif">Nuevo descuento hipotético <strong id="scenario-rate">${state.whatIf} %</strong></label><input type="range" id="whatif" min="0" max="15" step="1" value="${state.whatIf}"></div><div class="nova-scenario-result"><span>Incremento hipotético de ingresos</span><strong>${money(Math.round(uplift))}</strong><small>${num(moda.length)} transacciones elegibles</small></div></section>${section('Auditoría de descuentos','Operaciones con descuento superior al 15 %',`<div class="nova-audit"><strong>${discountAudit.length}</strong><span>operaciones detectadas</span><p>El valor cero corresponde a los filtros y datos actuales; no es un error.</p></div>`)}${section('Detalle de categorías','Indicadores conciliados',`<div class="nova-table-scroll" tabindex="0" role="region" aria-label="Tabla de datos"><table class="nova-table"><thead><tr><th>Categoría</th><th>Transacciones</th><th>Unidades</th><th>Bruto</th><th>Descuentos</th><th>Neto</th></tr></thead><tbody>${category.map(r=>`<tr><td>${esc(r.name)}</td><td>${num(r.orders)}</td><td>${num(r.units)}</td><td>${money(r.gross)}</td><td>${money(r.discount)}</td><td class="nova-cell-money">${money(r.net)}</td></tr>`).join('')}</tbody></table></div>`)}<div class="nova-actions"><button class="nova-cta" id="download-rows">${icon('down')} Exportar ventas filtradas</button><button class="nova-secondary" id="print-report">Guardar vista como PDF</button></div>${callout('Lo que no puede deducirse de esta fuente','No contiene existencias, datos personales de clientes ni costos de adquisición. No se calculan márgenes, rentabilidad real o stock a partir de unidades vendidas.')}`}
function chatPage() {
  return `${info('NOVA RETAIL', 'Asistente comercial', 'Analiza ventas históricas y explora decisiones con el contexto de tu negocio.')}${filters()}${analyst(state, { esc, icon })}`;
}
const renderers={inicio:home,productos:productsPage,clientes:channelsPage,ventas:salesPage,inventario:storesPage,reportes:reportsPage,asistente:chatPage};
function nav(){const page=active();$('#desktop-nav').innerHTML=ids.map(id=>`<a href="#${id}" ${page===id?'aria-current="page"':''}>${icon(id)}<span>${names[id]}</span></a>`).join('');const primary=['inicio','productos','ventas','reportes','asistente'];$('#mobile-nav').innerHTML=primary.map(id=>`<a href="#${id}" ${page===id?'aria-current="page"':''}>${icon(id)}<span>${names[id]}</span></a>`).join('')+`<button id="nova-more" type="button" aria-expanded="${state.more}" ${['clientes','inventario'].includes(page)?'aria-current="true"':''}>${icon('more')}<span>Más</span></button>`+(state.more?`<div class="nova-more-menu"><a href="#clientes" ${page==='clientes'?'aria-current="page"':''}>Canales</a><a href="#inventario" ${page==='inventario'?'aria-current="page"':''}>Tiendas</a></div>`:'')}
function render(){const page=active();nav();$('#breadcrumb').textContent=names[page];document.title=names[page]+' · Nova Retail | DataCore AI';$('#view').innerHTML=renderers[page]();$('.demo-label').innerHTML='<i></i> Nova Retail · 2025';const footer=$('.page-footer');footer.querySelector('button').textContent='Fuente: ventas históricas de Nova Retail';$('#network-status').textContent='';$('#theme-toggle').innerHTML=icon(document.documentElement.dataset.theme==='dark'?'sun':'moon');$('#theme-toggle').setAttribute('aria-label','Cambiar tema');$('#view').dataset.page=page;const q=$('#global-search');if(q)q.value='';const sr=$('#global-results');if(sr)sr.hidden=true;if(page==='asistente'){$('#chat-log').scrollTop=$('#chat-log').scrollHeight;}}
async function askChat(text, fullPeriod = false) {
  const question = text?.trim();
  if (!question || state.pending) return;
  const request = new AbortController();
  const history = state.chat.slice(-12).map(turn => ({
    role: turn.role,
    content: turn.role === 'user' ? turn.text : turn.sections.map(part => part.text).join('\n').slice(0, 2400),
  }));
  const context = {};
  if (!fullPeriod) {
    if (state.category !== 'Todas') context.category = [state.category];
    if (state.shop !== 'Todas') context.shop = [state.shop];
    if (state.channel !== 'Todos') context.channel = [state.channel];
    if (state.month !== 'Todos') context.month = [Object.keys(months).find(key => months[key] === state.month)];
  }
  const payload = { message: question, history, context };
  while (JSON.stringify(payload).length > 17000 && history.length) history.splice(0, 2);

  state.chat.push({ role: 'user', text: question });
  state.pending = request;
  state.draft = '';
  state.error = '';
  render();
  $('#chat-input').focus();
  const timeout = setTimeout(() => request.abort(), 30000);
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: request.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(result.sections)) {
      throw new Error(result.message || 'El asistente no está disponible en este momento.');
    }
    if (state.pending === request) state.chat.push({ role: 'assistant', ...result });
  } catch (error) {
    if (state.pending !== request) return;
    state.chat.pop();
    state.error = error.name === 'AbortError' ? 'La consulta tardó demasiado. Puedes intentarlo de nuevo.'
      : error instanceof TypeError ? 'Se perdió la conexión con el asistente. Intenta de nuevo.' : error.message;
    if (!state.draft) state.draft = question;
  } finally {
    clearTimeout(timeout);
    if (state.pending === request) {
      state.pending = null;
      if (active() === 'asistente') {
        const restoreFocus = document.activeElement === $('#chat-input');
        render();
        if (restoreFocus) $('#chat-input').focus();
      }
    }
  }
}
function searchGlobal(q){const el=$('#global-results'),matches=$('#search-matches'),status=$('#search-status');if(!q.trim()){el.hidden=true;return}const term=normalize(q);const items=[...catalog.filter(p=>normalize(p.name).includes(term)).slice(0,5).map(p=>({title:p.name,sub:p.category,href:'#productos'})),...Object.entries(names).filter(([id,label])=>normalize(label).includes(term)).map(([id,label])=>({title:label,sub:'Sección',href:'#'+id})),...shops.filter(n=>normalize(n).includes(term)).map(n=>({title:n,sub:'Tienda',href:'#inventario'}))].slice(0,8);status.textContent=items.length?`${items.length} resultados`:'No se encontraron coincidencias';matches.innerHTML=items.map(i=>`<a href="${i.href}"><strong>${esc(i.title)}</strong><small>${esc(i.sub)}</small></a>`).join('');el.hidden=false}
document.addEventListener('change',e=>{const target=e.target;if(target.matches('[data-filter]')){state[target.dataset.filter]=target.value;state.page=0;render();return}if(target.id==='nova-sort'){state.sort=target.value;render();return}});
document.addEventListener('input',e=>{if(e.target.id==='chat-input'){state.draft=e.target.value;return}if(e.target.id==='sales-search'){const val=e.target.value;clearTimeout(searchTimeout);searchTimeout=setTimeout(()=>{state.term=val;state.page=0;render();const input=$('#sales-search');if(input){input.focus()}},180);return}if(e.target.id==='global-search'){searchGlobal(e.target.value);return}if(e.target.id==='whatif'){state.whatIf=+e.target.value;$('#scenario-rate').textContent=state.whatIf+' %';const r=filtered().filter(r=>r.category==='Moda'&&r.discount===.15);const v=r.reduce((a,r)=>a+r.gross*(.15-state.whatIf/100),0);$('.nova-scenario-result strong').textContent=money(Math.round(v));return}});
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;if(b.dataset.resetFilters){Object.assign(state,{channel:'Todos',shop:'Todas',category:'Todas',month:'Todos',page:0});render();return}if(b.id==='download-rows'){download();return}if(b.id==='print-report'){window.print();return}if(b.dataset.page){state.page=Math.max(0,state.page+Number(b.dataset.page));render();return}if(b.id==='nova-more'){state.more=!state.more;nav();return}if(b.id==='reset-chat'){state.pending?.abort();Object.assign(state,{chat:[],pending:null,draft:'',error:''});render();$('#chat-input').focus();return}if(b.dataset.suggest){askChat(b.dataset.suggest,b.hasAttribute('data-full-period'));return}if(b.dataset.productLink){state.term=b.dataset.productLink;return}if(b.id==='theme-toggle'){const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('datacore-novaretail-theme',next)}catch{};$('#theme-toggle').innerHTML=icon(next==='dark'?'sun':'moon');return}if(b.classList.contains('chrome-source')){alert('Origen: libro proporcionado por el usuario, hoja in, 1,671 transacciones de Nova Retail (enero-marzo 2025). USD. Datos históricos; no incluye inventario, clientes ni costos. Ventas netas conciliadas: $749,087.25.');return}});
document.addEventListener('submit',e=>{if(e.target.id==='chat-form'){e.preventDefault();const input=$('#chat-input');const q=input.value;askChat(q);return}});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#global-search')?.focus()}if(e.key==='Escape'){$('#global-results').hidden=true;state.more=false;nav()}if(e.key==='Enter'&&e.target.id==='chat-input'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.closest('form')?.requestSubmit()}});
window.addEventListener('hashchange',()=>{state.more=false;state.page=0;render();window.scrollTo({top:0,behavior:'instant'})});
try{const t=localStorage.getItem('datacore-novaretail-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}
$('#global-search').placeholder='Buscar productos, tiendas, reportes…';$('label[for="global-search"]').textContent='Buscar productos, tiendas y secciones';$('#search-clear').addEventListener('click',()=>{const e=$('#global-search');e.value='';searchGlobal('');e.focus()});
render();
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
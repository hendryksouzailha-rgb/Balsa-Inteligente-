import {icon} from './icons.js';
import {clock,formatTime,track,terminals,scenes,safe} from './model.js';
import {tag,tile,button,linkButton,notices,detail,pageHeader} from './shared.js';
const points={start:[222,140],end:[574,198]};
const boatState = tr => tr.state==='Navegando'?'Navegando para '+terminals[tr.to]:tr.state+' em '+terminals[tr.to];
function mapPoint(t) {
  const {start:s,end:e}=points;
  return [s[0]+(e[0]-s[0])*t,s[1]+(e[1]-s[1])*t-7*Math.sin(Math.PI*t)];
}
function boatMarker(t) {
  const p=mapPoint(t);
  return `translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`;
}
const action=(url,name,ico,color,desc='')=>`<a href="#/${url}" class="action">${tile(ico,color)}<span><strong>${name}</strong>${desc?`<small>${desc}</small>`:''}</span>${icon('chevron',16,'action-chevron')}</a>`;
export function mapCard(ctx,full=false) {
  const {db,vessel,zoom}=ctx;
  const tr=track(clock().minute,db.scene,vessel);
  return `<section class="panel map-card ${full?'full-map':''}"><div class="panel-head"><div class="heading-icon">${tile('radar','teal')}<h2>${full?'Posição da embarcação':'Mapa da travessia'}</h2></div>
  ${full?tag('GPS simulado','green',true):`<a href="#/mapa" class="map-open" aria-label="Ampliar mapa">${icon('expand',15)}<span>Ampliar</span></a>`}</div>
  <div class="map-area"><svg class="map-svg" viewBox="0 0 800 330" preserveAspectRatio="xMidYMid slice" aria-label="Mapa ilustrativo do canal, com o terminal de São Sebastião à esquerda e o de Ilhabela à direita" role="img">
    <g id="map-layer" transform="translate(400 165) scale(${zoom}) translate(-400 -165)">
    <image href="./assets/mapa-canal.svg" width="800" height="330"/>
    <path d="M222 140 Q398 155 574 198" class="route-halo"/><path d="M222 140 Q398 155 574 198" class="route-dash"/>
    ${[[222,140,'São Sebastião','left'],[574,198,'Ilhabela','right']].map(([x,y,label,side])=>`<g transform="translate(${x} ${y})"><circle r="11" fill="#fff" opacity=".84"/><circle r="6" fill="#08736d" stroke="white" stroke-width="2"/><g transform="translate(${side==='left'?-42:28} ${side==='left'?-35:35})"><rect x="${side==='left'?-57:-41}" y="-14" width="${side==='left'?114:82}" height="28" rx="6" fill="white" stroke="#c2d8d5"/><text y="4" text-anchor="middle" class="terminal-label">${label}</text></g></g>`).join('')}
    <g id="map-boat" transform="${boatMarker(tr.position)}"><circle r="27" fill="#21766e" opacity=".17"/><circle r="19.5" fill="#0b605e" stroke="#fff" stroke-width="3.5"/><g transform="translate(-11 -12)" fill="none" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l8-3 8 3-2 5-6 2-6-2zM6 11V6h10v5M9 6V3h4v3M11 11v6M3 22q3 1.5 5 0 3 1.5 5 0 3 1.5 6 0"/></g></g>
    </g></svg>
    <div class="map-stamp"><span class="dot"></span>Rastreio simulado</div>
    ${full?`<div class="map-controls"><button data-act="zoom-in" aria-label="Aproximar mapa" ${zoom>=1.6?'disabled':''}>${icon('plus',17)}</button><button data-act="zoom-out" aria-label="Afastar mapa" ${zoom<=1?'disabled':''}>${icon('minus',17)}</button><button data-act="recenter" aria-label="Centralizar mapa">${icon('locate',17)}</button></div>`:''}
    <div class="map-north" aria-label="Norte">N<span>▲</span></div></div>
  <div class="map-foot"><div class="vessel-id">${tile('ship','sea')}<div><strong>Balsa ${String(vessel+1).padStart(2,'0')}</strong><span id="map-state">${boatState(tr)}</span></div></div><div class="map-timings"><div class="map-eta"><span>Última saída</span><strong id="home-last">${tr.last}</strong></div><div class="map-eta"><span>Chegada prevista</span><strong id="map-arrival">${tr.arrival}</strong></div></div></div></section>`;
}
function graph(kind,scene) {
  if(kind==='flow') return `<svg class="spark" viewBox="0 0 64 27" aria-hidden="true">${[9,13,11,17,14,20,18,24,22].map((h,i)=>`<rect x="${i*7}" y="${27-h}" width="4" height="${h}" rx="1.5" fill="currentColor" opacity="${i<5?.5:1}"/>`).join('')}</svg>`;
  const lines=kind==='sea'?'M1 12q5-8 10 0t10 0t10 0t10 0t10 0t10 0M1 20q5-8 10 0t10 0t10 0t10 0t10 0t10 0':kind==='next'?'M1 23h12v-5h13v-5h13V8h13V3h10':scene==='vento'?'M1 23l10-4 6 2 8-7 7 4 10-10 8 3 12-8':'M1 20l7-5 7 3 8-8 8 4 8-6 7 4 7-7 8 2';
  return `<svg class="spark" viewBox="0 0 65 28" aria-hidden="true"><path d="${lines}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const metric=(label,value,caption,ico,color,kind,scene)=>`<article class="metric"><div class="metric-label">${tile(ico,color)}<span>${label}</span></div><div class="metric-read"><strong>${value}</strong><span class="spark-color ${color}">${graph(kind,scene)}</span></div><p>${caption}</p></article>`;
export function home(ctx,choose=false) {
  const {db,profile}=ctx, n=clock(), s=scenes[db.scene], tr=track(n.minute,db.scene,ctx.vessel);
  const picker=choose||!profile;
  const alerts=notices(db,profile), next=alerts[0];
  return `<div class="home">
  <section class="hero"><div class="hero-copy"><div class="hero-route">${icon('pin',15)} São Sebastião <span>↔</span> Ilhabela</div>
  <h1>${picker?'Como deseja acessar?':'Painel da travessia'}</h1><p>${picker?'Escolha seu perfil para organizar o embarque.':`Olá, ${safe(profile.name.split(' ')[0])}. Acompanhe o canal e planeje sua próxima viagem.`}</p>
  <div class="hero-buttons">${picker?`${button('role','Morador','home','mint','data-role="morador"')}${button('role','Turista','bag','glass','data-role="turista"')}`:`${linkButton('transporte','Agendar travessia','calendar','mint')}${linkButton('horarios','Ver horários','clock','glass')}`}</div></div></section>
  <section class="conditions"><div class="section-title"><h2>Condições da travessia</h2><span class="simulation"><i class="dot"></i>Simulação <span class="divider-little"></span> <span id="home-clock">${formatTime(n.minute)}</span></span></div>
  <div class="metric-grid">
  ${metric('Tempo de espera',`${s.wait} <small>min</small>`,'Média para embarque','clock','teal','wait',db.scene)}
  ${metric('Fluxo atual',s.flow,'Movimento nos terminais','flow',db.scene==='vento'?'red':db.scene==='tranquilo'?'green':'amber','flow',db.scene)}
  ${metric('Próxima saída',`<span id="home-next">${tr.next}</span>`,'Travessia de balsa','ship','blue','next',db.scene)}
  ${metric('Situação do mar',s.sea,`${s.temp} °C <span class="mid-dot">·</span> Vento ${s.wind} km/h`,'waves','green','sea',db.scene)}
  </div></section>
  <div class="dashboard-grid">${mapCard(ctx)}<section class="panel quick-card"><div class="panel-head"><div class="heading-icon">${tile('grid','blue')}<h2>Acesso rápido</h2></div></div><div class="quick-list">
  ${action('transporte','Agendar travessia','calendar','teal','Escolher transporte e horário')}${action('carteira','Cartão digital','card','blue','Acesso do morador')}${action('qr','Gerar QR Code','qr','green','Embarque do turista')}${action('horarios','Horários disponíveis','clock','amber','Consultar as próximas saídas')}
  </div></section></div>
  <div class="dashboard-grid secondary"><section class="panel"><div class="panel-head"><div class="heading-icon">${tile('bell','amber')}<h2>Avisos da travessia</h2></div><a class="text-link" href="#/avisos">Ver todos</a></div><div class="preview-alert"><div><strong id="notice-preview-title">${safe(next.title)}</strong><p id="notice-preview-text">${safe(next.text)}</p></div></div></section>
  <section class="panel feedback-link">${tile('chat','teal')}<div><h2>Como foi a travessia?</h2><a class="text-link" href="#/feedback">Enviar feedback</a></div></section></div></div>`;
}
export function tracking(ctx) {
  const {db,vessel}=ctx, s=scenes[db.scene], tr=track(clock().minute,db.scene,vessel);
  return `${pageHeader('Rastreamento da balsa','Acompanhe o trajeto e as previsões do embarque simulado.')}
  <div class="track-layout">${mapCard(ctx,true)}<aside class="panel pad track-aside"><div class="heading-icon">${tile('ship','teal')}<h2>Dados da embarcação</h2></div>
  <label class="field">Embarcação<select id="vessel-select"><option value="0" ${!vessel?'selected':''}>Balsa 01</option><option value="1" ${vessel?'selected':''}>Balsa 02</option></select></label><dl class="details">
  ${detail('Situação','<span id="track-state">'+tr.state+'</span>')}${detail('Local atual','<span id="track-side">'+tr.at+'</span>')}${detail('Origem','<span id="track-from">'+terminals[tr.departure]+'</span>')}${detail('Destino','<span id="track-to">'+terminals[tr.destination]+'</span>')}${detail('Última saída','<span id="track-last">'+tr.last+'</span>')}${detail('Próxima saída','<span id="track-next">'+tr.next+'</span>')}${detail('Tempo até a chegada','<span id="track-left">'+tr.remain+' min</span>')}
  </dl></aside></div><section class="panel pad weather"><div class="heading-icon">${tile('sun','amber')}<h2>Condições marítimas</h2></div><div class="weather-cells">${[['temp','Temperatura',s.temp+' °C'],['waves','Mar',s.sea],['wind','Vento',s.wind+' km/h'],['clock','Possibilidade de atrasos',db.scene==='vento'?'Elevada':'Baixa']].map(([i,l,val])=>`<div>${icon(i,22)}<span>${l}</span><strong>${val}</strong></div>`).join('')}</div><a class="text-link" href="#/sistema">Sobre os dados da simulação</a></section>`;
}
export function tick(ctx) {
  const now=clock(), tr=track(now.minute,ctx.db.scene,ctx.vessel);
  const vals={'home-clock':formatTime(now.minute),'home-next':tr.next,'map-state':boatState(tr),'map-arrival':tr.arrival,'track-state':tr.state,'track-side':tr.at,'track-from':terminals[tr.departure],'track-to':terminals[tr.destination],'track-last':tr.last,'track-next':tr.next,'track-left':tr.remain+' min','home-last':tr.last};
  for (const [id,val] of Object.entries(vals)) {const el=document.getElementById(id);if(el && el.textContent!==val) el.textContent=val;}
  const b=document.getElementById('map-boat');if(b)b.setAttribute('transform',boatMarker(tr.position));
}


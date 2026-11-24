import {icon} from './icons.js';
import {modes,terminals,clock,isVehicle,shortDate,timeSlots,slotCounts,safe,myTrips,tripStatus} from './model.js';
import {tag,tile,button,linkButton,tripRoute,pageHeader,empty,detail,inlineError} from './shared.js';
import QRCode from './vendor/qr/index.js';
import level from './vendor/qr/QRErrorCorrectLevel.js';

const modeLine=m=>isVehicle(m)?'Balsa de veículos':'Embarque preferencial no catamarã';
const roleIcon=role=>role==='morador'?'home':'bag';
function passQR(id){
  const qr=new QRCode(0,level.M);
  qr.addData('BALSA-INTELIGENTE:DEMO:'+id);
  qr.make();
  const count=qr.getModuleCount(), size=count+8, dots=[];
  for(let y=0;y<count;y++) for(let x=0;x<count;x++) if(qr.isDark(y,x)) dots.push(`M${x+4} ${y+4}h1v1h-1z`);
  return `<svg class="real-qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR Code do embarque ${safe(id)}"><rect width="${size}" height="${size}" fill="white"/><path d="${dots.join('')}" fill="#0a2633"/></svg>`;
}
export function register(ctx,role) {
  const resident=role==='morador';
  return `${pageHeader('Cadastro de '+role,'', 'acesso')}<div class="register-grid"><section class="panel form-panel"><div class="form-title">${tile(roleIcon(role),'teal',true)}<div><h2>Dados do ${role}</h2><p>Use informações fictícias para testar o cadastro.</p></div></div>
  <form id="signup" data-role="${role}"><label class="field">Nome completo<input name="name" type="text" required minlength="3" maxlength="95" placeholder="Nome e sobrenome" autocomplete="off"></label>
  <label class="field">CPF<input name="cpf" type="text" required inputmode="numeric" maxlength="14" placeholder="000.000.000-00" autocomplete="off"></label>
${resident?`<label class="field">RG<input name="rg" type="text" required minlength="3" maxlength="18" placeholder="Número do RG" autocomplete="off"></label><label class="field">Comprovante de residência<span class="file-input">${icon('upload',20)}<span id="file-label">Selecionar PDF ou imagem</span><input type="file" name="proof" accept="application/pdf,image/*"></span></label>`:''}
  ${inlineError()}<div class="form-bottom"><button class="btn primary" type="submit">${icon('check',17)}Concluir cadastro</button>${button('sample-data','Usar dados de exemplo','','plain')}</div></form></section>
  <aside class="note-card"><span class="large-icon">${icon('shield',30)}</span><h2>Perfil salvo neste navegador</h2><p>Nos próximos acessos, basta escolher seu perfil para continuar.</p><p>O nome e o tipo de perfil ficam salvos. O CPF${resident?', o RG e o comprovante são usados':' é usado'} apenas para simular o cadastro.</p></aside></div>`;
}
export function transport(){
  return `${pageHeader('Qual transporte deseja utilizar?','Escolha como você vai fazer a travessia.')}
  <div class="transport-grid">${Object.entries(modes).map(([id,m])=>`<a href="#/agendar/${id}" class="panel transport-option">${tile(m.icon,isVehicle(id)?'blue':'teal',true)}<h2>${m.label}</h2><p>${modeLine(id)}</p><span class="choice-link">Selecionar ${icon('chevron',14)}</span></a>`).join('')}</div>
  <div class="intro-note">${icon('info',19)}<p>Os horários de pedestres e bicicletas organizam o fluxo. Motos e carros compartilham 40 vagas por saída nesta demonstração.</p></div>`;
}
function filters(d) {
  return `<div class="schedule-filters"><label class="field">Ponto de partida<select data-filter="from">${terminals.map((name,i)=>`<option value="${i}" ${d.from===i?'selected':''}>${name}</option>`).join('')}</select></label>
  <label class="field">Data da travessia<input type="date" data-filter="date" value="${safe(d.date)}" min="${clock().day}" required></label><label class="field">Período<select data-filter="period">${[['todos','Todo o dia'],['madrugada','Madrugada'],['manha','Manhã'],['tarde','Tarde'],['noite','Noite']].map(([v,l])=>`<option value="${v}" ${d.period===v?'selected':''}>${l}</option>`).join('')}</select></label></div>`;
}
export function schedule(ctx, booking, mode) {
  const d=booking?ctx.draft:ctx.browse, vehicle=isVehicle(mode), m=modes[mode];
  const all=timeSlots(d.date,clock(),d.period), pages=Math.max(1,Math.ceil(all.length/6));
  d.page=Math.min(Math.max(0,d.page),pages-1);
  if(d.time&&!all.includes(d.time))d.time='';
  const chips=booking?`<div class="mode-heading">${tile(m.icon,vehicle?'blue':'teal')}<span><strong>${m.label}</strong><small>${modeLine(mode)}</small></span><a href="#/transporte" class="text-link">Trocar</a></div>`:
  `<div class="segmented"><button data-act="browse-mode" data-mode="carro" aria-pressed="${vehicle}" class="${vehicle?'selected':''}">${icon('car',18)} Veículos</button><button data-act="browse-mode" data-mode="pedestre" aria-pressed="${!vehicle}" class="${!vehicle?'selected':''}">${icon('walk',18)} Pedestres e bicicletas</button></div>`;
  const rows=all.slice(d.page*6,d.page*6+6).map(t=>{
    const c=slotCounts(ctx.db.bookings,d.date,t,d.from), full=vehicle&&c.free===0, few=vehicle&&c.free>0&&c.free<=5, sel=d.time===t;
    const label=vehicle?(full?'Horário lotado':few?'Poucas vagas':'Disponível'):'Fluxo estimado';
    return `<button type="button" class="slot ${sel?'chosen':''}" data-act="select-time" data-time="${t}" aria-pressed="${sel}" ${full?'disabled':''}>
    <span class="slot-time">${icon('clock',17)}<strong>${t}</strong></span><span class="slot-data"><span>${vehicle?`${c.used}/40 vagas ocupadas`:`Aprox. ${c.people} pedestres agendados`}</span>${vehicle?`<small>${full?'Nenhuma vaga restante':c.free===1?'Resta 1 vaga':`Restam ${c.free} vagas`}</small>`:''}</span><span class="slot-status">${tag(label,full?'red':few?'amber':vehicle?'green':'blue')}</span><span class="select-dot">${sel?icon('check',13):''}</span></button>`;
  }).join('');
  const summary=booking?`<aside class="panel pad summary"><div class="heading-icon">${tile('ticket','teal')}<h2>Sua travessia</h2></div><dl class="details">${detail('Transporte',m.label)}${detail('Origem',terminals[d.from])}${detail('Destino',terminals[1-d.from])}${detail('Data',shortDate(d.date))}${detail('Horário',d.time||'Selecione uma saída')}</dl>
  ${vehicle?`<label class="field">Placa do veículo<input id="booking-plate" type="text" value="${safe(d.plate)}" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="ABC1D23"></label>`:''}${inlineError()}${button('book','Concluir agendamento','calendar','primary full',!d.time?'disabled':'')}
  <p class="form-hint">${vehicle?'Uma reserva corresponde a uma vaga. O pagamento vem depois da confirmação.':'A seleção do horário serve para estimar o movimento de passageiros.'}</p></aside>`:
  `<aside class="note-card"><span class="large-icon">${icon(vehicle?'car':'walk',30)}</span><h2>${vehicle?'Vagas por horário':'Horários de passageiros'}</h2><p>${vehicle?'Motos e carros compartilham 40 vagas por horário e sentido. A disponibilidade é atualizada a cada reserva neste navegador.':'O catamarã atende preferencialmente quem vai a pé ou de bicicleta. Todos os horários futuros aceitam agendamentos de passageiros.'}</p>${d.time?button('book-from-table','Agendar às '+d.time,'calendar','primary full'):'<p>Selecione uma saída para iniciar o agendamento.</p>'}</aside>`;
  return `${pageHeader(booking?'Agendar travessia':'Horários disponíveis',booking?'Escolha o sentido, a data e o melhor horário para embarcar.':'Consulte as saídas nos dois sentidos do canal.',booking?'transporte':'painel')}
  <div class="schedule-grid"><section class="panel pad schedule-panel">${chips}${filters(d)}<div class="list-title"><h2>Horários de saída</h2><small>${vehicle?'Balsa':'Catamarã'} · ${terminals[d.from]}</small></div>
  <div class="slot-list">${rows||'<p class="no-slots">Os horários deste período já passaram. Escolha outra data ou período.</p>'}</div>
  ${pages>1?`<div class="pagination">${button('time-prev','Anteriores','back','small quiet',d.page===0?'disabled':'')}<small>${d.page+1} de ${pages}</small>${button('time-next','Próximos','','small quiet',d.page===pages-1?'disabled':'')}</div>`:''}</section>${summary}</div>`;
}
function residentCard(p) {
  return `<div class="access-card"><div class="access-top"><span>${icon('ship',23)} Balsa Inteligente</span>${icon('contactless',26)}</div><div><small>CARTÃO DIGITAL DE MORADOR</small><strong>${safe(p.name)}</strong></div><div class="access-base"><span>${safe(p.card)}</span><span>Catamarã</span></div></div>`;
}
function touristPass(p,b) {
  return `<div class="qr-ticket"><div class="qr-head"><span>${icon('qr',18)} Passe de embarque</span>${tag('Turista','blue')}</div>${passQR(b.id)}<strong>${safe(p.name)}</strong><span class="mono">${safe(b.id)}</span></div>`;
}
function passPanel(p,b){
  return `<section class="panel pad pass-panel"><div class="heading-icon">${tile(p.role==='morador'?'card':'qr','teal')}<h2>${p.role==='morador'?'Cartão digital':'QR Code de acesso'}</h2></div>${p.role==='morador'?residentCard(p):touristPass(p,b)}
  <div class="pass-info">${tag(b.used?'Entrada validada':'Agendamento validado','green',true)}<span>${shortDate(b.date)} · ${b.time}</span></div>
  ${button('person-scan',b.used?'Embarque validado':'Simular leitura na catraca',b.used?'check':'scan','secondary full',`data-id="${b.id}" ${b.used?'disabled':''}`)}<p class="form-hint">A leitura representa a passagem no horário da reserva.</p></section>`;
}
export function tripDetails(ctx,b,success=false) {
  const vehicle=isVehicle(b.mode), m=modes[b.mode], p=ctx.profile, paid=b.payment==='pago';
  return `${pageHeader(success?'Agendamento concluído':'Detalhes do embarque',success?'Sua travessia foi registrada neste navegador.':'Consulte a reserva e a autorização de acesso.','embarques')}
  <div class="schedule-grid"><section class="panel pad trip-summary"><div class="form-title">${tile(m.icon,vehicle?'blue':'teal',true)}<div><h2>${m.label} · ${m.vessel}</h2><p>${safe(b.id)}</p></div></div><div class="trip-route"><span class="trip-stop"><i></i><small>Partida</small><strong>${terminals[b.from]}</strong></span><span class="trip-stop"><i></i><small>Chegada</small><strong>${terminals[1-b.from]}</strong></span></div>
  <dl class="details">${detail('Titular',safe(p.name))}${detail('Data da travessia',shortDate(b.date))}${detail('Horário selecionado',b.time)}${vehicle?detail('Placa do veículo',safe(b.plate)):''}${detail('Status do embarque',tag(tripStatus(b),b.payment==='pendente'?'amber':'green'))}${vehicle?detail('Posição na fila virtual',b.position+'ª do horário'):detail('Fila virtual','Horário registrado')}${vehicle&&paid?detail('Pagamento',safe(b.method)):''}</dl>
  <div class="button-bar">${linkButton('embarques','Meus embarques','ticket','secondary')}${linkButton('mapa','Acompanhar balsa','radar','plain')}</div></section>
  ${vehicle?`<aside class="panel pad"><div class="heading-icon">${tile('gate','teal')}<h2>Acesso por placa</h2></div><p class="panel-desc">${paid?'A autorização está vinculada à sua placa e ao horário reservado.':'Confirme o pagamento para liberar a autorização de embarque pela placa.'}</p>${!paid?linkButton('pagamento/'+b.id,'Realizar pagamento','card','primary full'):''}${linkButton('portao/'+b.id,'Simular leitura da placa','scan',paid?'primary full':'secondary full separated')}<p class="form-hint">O atendimento no guichê continua disponível na proposta.</p></aside>`:passPanel(p,b)}</div>`;
}
export function trips(ctx) {
  const all=myTrips(ctx.db,ctx.profile);
  return `${pageHeader('Meus embarques','Acompanhe suas reservas, pagamentos e autorizações.')}<section class="panel pad">${all.length?`<div class="section-title"><h2>Travessias agendadas</h2>${linkButton('transporte','Novo agendamento','calendar','small secondary')}</div><div class="trip-list">${all.map(b=>`<a class="trip-item" href="#/embarque/${b.id}">${tile(modes[b.mode].icon,'teal',true)}<span class="trip-item-text"><strong>${tripRoute(b.from)}</strong><small>${shortDate(b.date)} · ${b.time} · ${modes[b.mode].label}</small></span>${tag(tripStatus(b),b.payment==='pendente'?'amber':'green')}${icon('chevron',17)}</a>`).join('')}</div>`:empty('ticket','Nenhuma travessia agendada','Escolha o transporte e o horário para criar seu primeiro embarque.')}</section>`;
}
export function wallet(ctx,kind) {
  const p=ctx.profile, all=myTrips(ctx.db,p).filter(b=>!isVehicle(b.mode));
  const title=kind==='qr'?'Gerar QR Code':'Cartão digital', preferred=kind==='qr'?'turista':'morador';
  const active=all.find(b=>b.id===ctx.passId)||all.find(b=>!b.used)||all[0];
  return `${pageHeader(title,p.role==='morador'?'O cartão de morador acompanha suas viagens a pé ou de bicicleta.':'O QR Code do turista é gerado automaticamente após a reserva.')}
  ${p.role!==preferred?`<section class="panel pad narrow">${empty(p.role==='morador'?'card':'qr',p.role==='morador'?'Seu acesso é pelo cartão de morador':'Seu acesso é pelo QR Code de turista',p.role==='morador'?'Use o mesmo cartão digital para as travessias de pedestre e bicicleta.':'Cada reserva de pedestre ou bicicleta gera um passe individual.',p.role==='morador'?'Abrir meu cartão':'Abrir meus QR Codes',kind==='qr'?'carteira':'qr')}</section>`:
  `<div class="wallet-grid">${active?passPanel(p,active):`<section class="panel pad">${p.role==='morador'?residentCard(p):''}${empty(p.role==='morador'?'card':'qr',p.role==='morador'?'Cartão cadastrado':'Seu QR Code aparecerá aqui','Agende uma travessia a pé ou de bicicleta para habilitar o acesso na catraca.','Agendar travessia','transporte')}</section>`}
  ${all.length?`<aside class="panel pad"><h2>Selecionar embarque</h2><div class="wallet-items">${all.map(b=>`<button data-act="pick-pass" data-id="${b.id}" class="wallet-item ${active?.id===b.id?'current':''}"><strong>${shortDate(b.date)} · ${b.time}</strong><span>${tripRoute(b.from)}</span><small>${tripStatus(b)}</small></button>`).join('')}</div></aside>`:''}</div>`}`;
}

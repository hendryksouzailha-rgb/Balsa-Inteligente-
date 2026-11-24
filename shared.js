import {icon} from './icons.js';
import {safe,terminals,clock,scenes,slotCounts,myTrips,inMinutes} from './model.js';

export const linkButton = (href,text,ico='',style='primary') => `<a class="btn ${style}" href="#/${href}">${ico?icon(ico,18):''}${text}</a>`;
export const button = (act,text,ico='',style='primary',extra='') => `<button type="button" class="btn ${style}" data-act="${act}" ${extra}>${ico?icon(ico,18):''}${text}</button>`;
export const tag=(txt,color='green',withDot=false)=>`<span class="tag ${color}">${withDot?'<i class="dot"></i>':''}${safe(txt)}</span>`;
export const tile=(name,color='teal',big=false)=>`<span class="tile ${color} ${big?'big':''}">${icon(name,big?24:19)}</span>`;
export const routeText = from => `<span class="route-text">${terminals[from]} ${icon('swap',15)} ${terminals[1-from]}</span>`;
export const tripRoute = from => `${terminals[from]} → ${terminals[1-from]}`;
export const pageHeader=(title,sub='',back='painel')=>`<div class="page-header"><a class="back-link" href="#/${back}">${icon('back',15)} Voltar</a><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>`;
export const empty=(ico,title,desc,cta='Agendar travessia',href='transporte')=>`<div class="empty"><span class="empty-icon">${icon(ico,31)}</span><h2>${title}</h2><p>${desc}</p>${cta?linkButton(href,cta,'calendar'):''}</div>`;
export const detail=(name,value)=>`<div class="detail-row"><dt>${name}</dt><dd>${value}</dd></div>`;
export const inlineError=()=>'<p class="form-error" data-error role="alert" hidden></p>';
export const msg=(ico,title,desc,color='teal')=>`<div class="message ${color}">${icon(ico,21)}<div><strong>${title}</strong><p>${desc}</p></div></div>`;
export function notices(db,profile) {
  const n=clock(), s=scenes[db.scene];
  const alerts=[];
  for(const b of myTrips(db,profile)) {
    if(b.date!==n.day||b.used) continue;
    const left=inMinutes(b.time)-Math.floor(n.minute);
    if(left>0&&left<=15) alerts.push({id:b.id+'-15',ico:'bell',color:'green',title:'Seu embarque está próximo',text:`Seu horário de embarque começará em ${left} ${left===1?'minuto':'minutos'}. Saída de ${terminals[b.from]} às ${b.time}.`,meta:'Seu embarque'});
  }
  if(db.scene==='vento') alerts.push({id:n.day+'-vento',ico:'wind',color:'amber',title:'Atenção às condições do mar',text:`Mar agitado pode causar atrasos. Neste cenário, o vento está a ${s.wind} km/h.`,meta:'Condições marítimas'});
  const hot=slotCounts(db.bookings,n.day,'15:00',0);
  if(n.minute<900) alerts.push({id:n.day+'-vagas-'+(hot.free===0?'lotado':'poucas'),ico:'flow',color:'amber',title:hot.free===0?'Saída das 15:00 lotada':'Poucas vagas às 15:00',text:hot.free===0?'As 40 vagas para veículos na saída de São Sebastião já foram reservadas.':`${hot.free===1?'Resta 1 vaga':'Restam '+hot.free+' vagas'} para veículos na saída de São Sebastião. Pedestres e bicicletas continuam com horários livres.`,meta:'Ocupação da balsa'});
  alerts.push({id:n.day+'-atraso',ico:'clock',color:'blue',title:'Atraso na saída das 10:30',text:'A travessia das 10:30 saiu com 20 minutos de atraso devido ao alto fluxo de veículos.',meta:'Registro da manhã'});
  return alerts;
}
export const readKey=(p)=>p?.id||'visitante';
export const unread=(db,p)=>notices(db,p).filter(n=>!(db.reads[readKey(p)]||[]).includes(n.id)).length;


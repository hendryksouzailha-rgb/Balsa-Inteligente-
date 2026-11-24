import {icon,brand} from './icons.js';
import {clock,loadDB,changeDB,getProfile,myTrips,modes,isVehicle,scenes,safe,token,makeBooking,gateCheck,normalPlate,slotCounts} from './model.js';
import {empty,notices,readKey,unread} from './shared.js';
import {home,tracking,tick} from './dashboard.js';
import {register,transport,schedule,tripDetails,trips,wallet} from './screens.js';
import {pay,gate,alertList,feedback,system,profilePage} from './more.js';

const qs=(s,r=document)=>r.querySelector(s);
const main=qs('#conteudo'), header=qs('#top'), footer=qs('#footer');
const freshDraft=()=>({from:0,date:clock().day,mode:'pedestre',time:'',plate:'',page:0,period:'todos'});
const ui={draft:freshDraft(),browse:{...freshDraft(),mode:'carro'},vessel:0,zoom:1,method:'Pix',passId:null,gateResult:null,gateInput:null,feedbackDone:false,returnTo:'painel'};
let current='',route='',id='',ctx,toastTimer;
const sections=[
  ['painel','Visão geral','grid',['painel','acesso']],
  ['mapa','Rastreamento','radar',['mapa']],
  ['horarios','Horários','clock',['horarios']],
  ['embarques','Meus embarques','ticket',['embarques','embarque','concluido','transporte','agendar','carteira','qr','pagamento','portao']]
];
const protectedRoutes=new Set(['transporte','agendar','embarques','embarque','concluido','carteira','qr','pagamento','portao','perfil']);
function readContext() {
  const db=loadDB();
  return {...ui,db,profile:getProfile(db)};
}
function path() {return location.hash.replace(/^#\/?/,'').replace(/\/+$/,'') || 'painel';}
function go(p,replace=false) {
  if(path()===p){render();return;}
  if(replace){history.replaceState(null,'','#/'+p);navigate();}
  else location.hash='/'+p;
}
function toast(text) {
  const box=qs('#toast');box.textContent=text;box.classList.add('visible');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>box.classList.remove('visible'),3300);
}
function errorMessage(text) {
  const b=qs('[data-error]');
  if(b) {b.textContent=text;b.hidden=false;b.scrollIntoView({block:'nearest'});}
  else toast(text);
}
function userInitials(p){return p.name.trim().split(/\s+/).filter(Boolean).map(x=>x[0]).filter((v,i,a)=>i===0||i===a.length-1).join('').toUpperCase();}
function appHeader() {
  const {db,profile:p}=ctx, auth=route==='cadastro', count=unread(db,p);
  const mobileLabels={painel:'Painel',mapa:'Mapa',horarios:'Horários',embarques:'Embarques'};
  const nav=sections.map(([url,name,ico,active])=>`<a href="#/${url}" aria-label="${name}" class="nav-item ${active.includes(route)?'active':''}" ${active.includes(route)?'aria-current="page"':''}>${icon(ico,16)}<span class="nav-long">${name}</span><span class="nav-short">${mobileLabels[url]}</span></a>`).join('');
  header.innerHTML=`<div class="top-inner"><a class="logo-link" href="#/painel" aria-label="Balsa Inteligente, visão geral">${brand}</a>${auth?`<span class="secure-nav">${icon('shield',17)} Cadastro de demonstração</span>`:`<nav class="main-nav" aria-label="Navegação principal">${nav}</nav><div class="account-tools"><a href="#/avisos" class="bell-button" aria-label="Notificações, ${count} não lidas">${icon('bell',21)}<i class="unread-dot" ${count?'':'hidden'}></i></a><a class="profile-link" href="#/${p?'perfil':'acesso'}" aria-label="${p?'Meu perfil':'Escolher perfil'}"><span class="avatar">${p?safe(userInitials(p)):icon('user',17)}</span><span class="profile-name">${p?safe(p.name.split(' ')[0]):'Visitante'}</span>${icon('down',13,'profile-chevron')}</a></div>`}</div>`;
  footer.innerHTML=`<div class="footer-inner"><span>${icon('waves',19)}Balsa Inteligente <i></i><span>Projeto acadêmico · Etec de São Sebastião</span></span><nav><a href="#/sistema">Sobre o sistema</a><a href="#/feedback">Feedback</a></nav></div>`;
}
function render() {
  ctx=readContext();appHeader();
  const b=myTrips(ctx.db,ctx.profile).find(x=>x.id===id);
  let content;
  switch(route){
    case 'painel': case 'acesso': content=home(ctx,route==='acesso');break;
    case 'cadastro':content=register(ctx,id);break;
    case 'mapa':content=tracking(ctx);break;
    case 'horarios':content=schedule(ctx,false,ui.browse.mode);break;
    case 'transporte':content=transport(ctx);break;
    case 'agendar':content=schedule(ctx,true,id);break;
    case 'embarques':content=trips(ctx);break;
    case 'carteira': case 'qr':content=wallet(ctx,route);break;
    case 'embarque':case 'concluido':case 'portao':case 'pagamento':
      if(!b){content=`<section class="panel pad fallback">${empty('ticket','Reserva não encontrada','Confira os embarques salvos no seu perfil.','Ver meus embarques','embarques')}</section>`;break;}
      if(route==='portao'&&isVehicle(b.mode))content=gate(ctx,b);
      else if(route==='pagamento'&&isVehicle(b.mode))content=pay(ctx,b);
      else content=tripDetails(ctx,b,route==='concluido');
      break;
    case 'avisos':content=alertList(ctx);break;
    case 'feedback':content=feedback(ctx);break;
    case 'sistema':content=system(ctx);break;
    case 'perfil':content=profilePage(ctx);break;
    default:content=`<section class="panel pad fallback">${empty('compass','Página não encontrada','Volte ao painel para acompanhar a travessia.','Voltar ao painel','painel')}</section>`;
  }
  main.innerHTML=content;
  document.title=(qs('h1',main)?.textContent||'Travessia')+' · Balsa Inteligente';
}
function navigate(){
  const next=path();
  if(next==='conteudo'){main.focus();history.replaceState(null,'','#/'+(current||'painel'));return;}
  const prev=current;[route,id='']=next.split('/');
  const db=loadDB(), p=getProfile(db);
  if(protectedRoutes.has(route)&&!p){ui.returnTo=next==='perfil'?'perfil':next;go('acesso',true);return;}
  if(route==='cadastro'&&!['morador','turista'].includes(id)){go('acesso',true);return;}
  if(route==='agendar'&&!modes[id]){go('transporte',true);return;}
  if(route==='agendar'){
    ui.draft.mode=id;
    if(ui.draft.time&&isVehicle(id)&&slotCounts(db.bookings,ui.draft.date,ui.draft.time,ui.draft.from).free===0)ui.draft.time='';
  }
  if(route==='portao'&&prev!==next){ui.gateInput=null;ui.gateResult=null;}
  if(route==='feedback'&&prev!==next)ui.feedbackDone=false;
  if(route==='pagamento'&&prev!==next)ui.method='Pix';
  current=next;render();
  if(prev!==next){
    window.scrollTo({top:0,behavior:'instant'});
    if(prev)main.focus({preventScroll:true});
  }
}
function afterProfile(){
  const destination=ui.returnTo||'painel';ui.returnTo='painel';go(destination,true);
}
async function chooseRole(role){
  const p=loadDB().profiles.find(profile=>profile.role===role);
  if(p) {await changeDB(db=>{db.active=p.id;});afterProfile();}
  else go('cadastro/'+role);
}
function currentDraft(){return route==='agendar'?ui.draft:ui.browse;}
function useSample(){
  const f=qs('#signup'), r=f.dataset.role==='morador';
  f.elements.name.value=r?'Marina Costa':'Caio Almeida';
  f.elements.cpf.value='000.000.000-00';
  if(r){f.elements.rg.value='00.000.000-0';f.elements.proof.value='';qs('#file-label').textContent='Comprovante de exemplo selecionado';}
  f.dataset.example='true';qs('[data-error]').hidden=true;
}
async function perform(action,el){
  const p=ctx.profile, d=currentDraft();
  switch(action){
    case 'role':await chooseRole(el.dataset.role);break;
    case 'sample-data':useSample();break;
    case 'switch-role':await changeDB(db=>{db.active=null;});ui.passId=null;ui.draft=freshDraft();ui.returnTo='painel';go('acesso');break;
    case 'browse-mode':d.mode=el.dataset.mode;d.time='';d.page=0;render();break;
    case 'time-prev':case 'time-next':d.page+=action==='time-prev'?-1:1;render();break;
    case 'select-time':d.time=el.dataset.time;render();qs('[data-time="'+d.time+'"]')?.focus({preventScroll:true});break;
    case 'book-from-table':ui.draft={...ui.browse,plate:''};go('transporte');break;
    case 'book':{
      if(!p)return;
      const val={...ui.draft,profile:p.id,time:ui.draft.time,mode:id};
      const b=await changeDB(db=>makeBooking(db,val));
      ui.draft=freshDraft();ui.passId=b.id;go('concluido/'+b.id,true);break;
    }
    case 'pick-pass':ui.passId=el.dataset.id;render();break;
    case 'person-scan':{
      await changeDB(db=>{const b=myTrips(db,p).find(x=>x.id===el.dataset.id&&!isVehicle(x.mode));if(!b)throw new Error('Passe não encontrado.');if(b.used)throw new Error('Este passe já foi validado.');b.used=true;});
      render();toast('Embarque autorizado. Catraca liberada na simulação.');break;
    }
    case 'pay-method':ui.method=el.dataset.method;render();break;
    case 'confirm-pay':{
      await changeDB(db=>{const b=myTrips(db,p).find(x=>x.id===el.dataset.id&&isVehicle(x.mode));if(!b)throw new Error('Reserva não encontrada.');if(b.payment!=='pago'){b.payment='pago';b.method=ui.method;}});
      go('embarque/'+el.dataset.id,true);toast('Pagamento confirmado na simulação.');break;
    }
    case 'zoom-in':case 'zoom-out':case 'recenter':ui.zoom=action==='recenter'?1:Math.min(1.6,Math.max(1,Math.round((ui.zoom+(action==='zoom-in'?.2:-.2))*10)/10));render();break;
    case 'read-all':case 'read-one':await changeDB(db=>{const key=readKey(p), ids=action==='read-one'?[el.dataset.id]:notices(db,p).map(n=>n.id);db.reads[key]=[...new Set([...(db.reads[key]||[]),...ids])];});render();break;
  }
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');
  if(!el||el.disabled)return;
  const action=el.dataset.act;
  if(['book','confirm-pay','person-scan'].includes(action))el.disabled=true;
  try {await perform(action,el);}catch(err){el.disabled=false;errorMessage(err.message);}
});
document.addEventListener('input',e=>{
  if(e.target.id==='booking-plate'){ui.draft.plate=e.target.value.toUpperCase();e.target.value=ui.draft.plate;}
  if(e.target.name==='cpf'){
    const num=e.target.value.replace(/\D/g,'').slice(0,11);
    e.target.value=num.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1-$2');
  }
});
document.addEventListener('change',async e=>{
  const el=e.target, key=el.dataset.filter;
  if(key){
    const d=currentDraft();
    if(key==='date'&&(!el.value||el.value<clock().day||!el.validity.valid)){el.value=d.date;toast('Escolha hoje ou uma data futura.');return;}
    d[key]=key==='from'?Number(el.value):el.value;
    d.page=0;d.time='';render();return;
  }
  if(el.name==='proof'){qs('#file-label').textContent=el.files[0]?.name||'Selecionar PDF ou imagem';if(el.files[0])qs('#signup').dataset.example='false';}
  if(el.id==='vessel-select'){ui.vessel=Number(el.value);render();}
  if(el.id==='scene-select'&&scenes[el.value]){await changeDB(db=>{db.scene=el.value;});render();toast('Cenário da demonstração atualizado.');}
  if(el.name==='rating'){
    const count=Number(el.value);
    document.querySelectorAll('.stars label').forEach((label,i)=>label.classList.toggle('lit',i<count));
    qs('#rating-text').textContent=['','Muito ruim','Ruim','Regular','Boa','Excelente'][count]+' · '+count+(count===1?' estrela':' estrelas');
  }
});
document.addEventListener('submit',async e=>{
  const f=e.target;
  if(!['signup','gate-form','feedback-form'].includes(f.id))return;
  e.preventDefault();
  const data=new FormData(f), submit=f.querySelector('[type="submit"]');submit.disabled=true;
  try{
    if(f.id==='signup'){
      const role=f.dataset.role,name=String(data.get('name')).trim().replace(/\s+/g,' ');
      if(name.split(' ').length<2)throw new Error('Digite o nome e o sobrenome para continuar.');
      if(String(data.get('cpf')).replace(/\D/g,'').length!==11)throw new Error('Preencha os 11 dígitos do CPF de exemplo.');
      if(role==='morador'){
        if(!/^[\dA-Za-z.-]{3,18}$/.test(String(data.get('rg')).trim()))throw new Error('Confira o número de RG.');
        const file=f.elements.proof.files[0];
        if(!file && f.dataset.example!=='true')throw new Error('Selecione um comprovante ou use os dados de exemplo.');
        if(file && !file.type.startsWith('image/') && file.type!=='application/pdf')throw new Error('Selecione um arquivo de imagem ou PDF.');
      }
      await changeDB(db=>{
        let p=db.profiles.find(x=>x.role===role);
        if(!p){p={id:token('PF-'),role,name,card:role==='morador'?token('MR-'):null};db.profiles.push(p);}
        db.active=p.id;
      });
      afterProfile();toast('Cadastro concluído. Perfil salvo neste navegador.');
    }
    if(f.id==='gate-form'){
      ui.gateInput={plate:normalPlate(String(data.get('plate'))),date:String(data.get('date')),time:String(data.get('time')),from:Number(data.get('from'))};
      ui.gateResult=await changeDB(db=>gateCheck(db,ui.gateInput));render();
    }
    if(f.id==='feedback-form'){
      const rating=Number(data.get('rating'));
      if(rating<1||rating>5)throw new Error('Escolha uma avaliação de 1 a 5 estrelas.');
      await changeDB(db=>{db.feedback.push({rating,comment:String(data.get('comment')).trim(),suggestion:String(data.get('suggestion')).trim(),profile:db.active,created:Date.now()});});
      ui.feedbackDone=true;render();
    }
  }catch(err){submit.disabled=false;errorMessage(err.message);}
});
window.addEventListener('hashchange',navigate);
window.addEventListener('storage',e=>{
  if(e.key!=='balsa-inteligente.app.v1')return;
  if(['cadastro','feedback','portao'].includes(route)){ctx=readContext();appHeader();return;}
  navigate();
});
let lastClockMinute=-1;
setInterval(()=>{
  if(!ctx)return;
  const now=clock(),min=Math.floor(now.minute);
  if(['painel','acesso','mapa'].includes(route))tick(ctx);
  if(min!==lastClockMinute){
    lastClockMinute=min;
    if(route==='painel'||route==='acesso'){
      const note=notices(ctx.db,ctx.profile)[0];
      qs('#notice-preview-title').textContent=note.title;
      qs('#notice-preview-text').textContent=note.text;
    }
    if(route==='avisos'){render();return;}
    if((route==='agendar'||route==='horarios')&&min%30===0)render();
    const cnt=unread(ctx.db,ctx.profile), bell=qs('.bell-button');
    if(bell){bell.setAttribute('aria-label',`Notificações, ${cnt} não lidas`);qs('.unread-dot',bell).hidden=!cnt;}
  }
},1000);
navigate();
try{
  if(!sessionStorage.getItem('bi.intro.v1')&&!location.hash){
    sessionStorage.setItem('bi.intro.v1','1');
    const splash=qs('#splash');splash.hidden=false;
    setTimeout(()=>{splash.classList.add('splash-out');setTimeout(()=>{splash.hidden=true;},220);},matchMedia('(prefers-reduced-motion: reduce)').matches?220:1050);
  }
}catch{}

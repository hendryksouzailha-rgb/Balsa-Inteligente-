export const terminals = ['São Sebastião', 'Ilhabela'];
export const modes = {
  pedestre: {label: 'Pedestre', vessel: 'Catamarã', icon: 'walk'},
  bicicleta: {label: 'Bicicleta', vessel: 'Catamarã', icon: 'bike'},
  moto: {label: 'Moto', vessel: 'Balsa', icon: 'moto'},
  carro: {label: 'Carro', vessel: 'Balsa', icon: 'car'}
};
export const isVehicle = mode => mode === 'moto' || mode === 'carro';
export const capacity = 40;
export const scenes = {
  tranquilo: {label: 'Movimento tranquilo', flow: 'Baixo', wait: 5, wind: 8, temp: 24, sea: 'Mar calmo', delay: 0},
  regular: {label: 'Operação habitual', flow: 'Moderado', wait: 15, wind: 12, temp: 26, sea: 'Mar calmo', delay: 0},
  vento: {label: 'Mar agitado e alta demanda', flow: 'Intenso', wait: 35, wind: 32, temp: 22, sea: 'Mar agitado', delay: 5}
};
export const demoDay = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const baseMinute = 13 * 60 + 36;
let sessionStart = Date.now();
try {
  const last = JSON.parse(sessionStorage.getItem('bi.clock.v1') || 'null');
  if (last && last.day === demoDay() && Date.now()-last.start < 5*3600000) sessionStart=last.start;
  else sessionStorage.setItem('bi.clock.v1', JSON.stringify({start:sessionStart,day:demoDay()}));
} catch {}
export const clock = () => {
  const elapsed = Math.max(0,Date.now()-sessionStart)/1000;
  const total = baseMinute + elapsed / 12;
  const day = addDays(demoDay(),Math.floor(total/1440));
  return {day, minute: total % 1440};
};
export function addDays(day, n) {
  const d = new Date(day+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
}
export function formatTime(minutes) {
  const whole = ((Math.floor(minutes)%1440)+1440)%1440;
  return String(Math.floor(whole/60)).padStart(2,'0')+':'+String(whole%60).padStart(2,'0');
}
export const inMinutes = time => Number(time.slice(0,2))*60 + Number(time.slice(-2));
export function shortDate(day, long=false) {
  return new Intl.DateTimeFormat('pt-BR',long?{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}:{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
}
export function track(minute, scene='regular', vessel=0) {
  const leg=Math.floor(minute/30);
  const phase=minute-leg*30;
  const from=((leg+1+vessel)%2+2)%2, to=1-from;
  const duration=15+scenes[scene].delay;
  const underway=phase<duration;
  const progress=Math.min(phase/duration,1);
  const state=phase<duration-3?'Navegando':underway?'Atracando':'Embarcando';
  const nextArrival=underway?leg*30+duration:(leg+1)*30+duration;
  return {from,to,phase,state,underway,progress,position:from?1-progress:progress,
    remain: Math.max(0,Math.ceil(nextArrival-minute)), arrival:formatTime(nextArrival),
    last:formatTime(leg*30), next:formatTime((leg+1)*30), at:underway?'No canal':terminals[to],
    destination:underway?to:from, departure:underway?from:to};
}
function seeded(date,time,from) {
  let val=17;
  for (const c of date+'|'+time+'|'+from) val=(val*31 + c.charCodeAt(0))>>>0;
  return val;
}
export function slotCounts(bookings, date, time, from) {
  const seed=seeded(date,time,from);
  const examples={'14:00':32,'15:00':38,'16:00':40};
  const base=examples[time] ?? (seed%9===0?38:8+seed%27);
  const approx=({'14:00':45,'15:00':62})[time] ?? (18+seed%65);
  const list=bookings.filter(b=>b.date===date && b.time===time && b.from===from);
  const vehicles=Math.min(capacity,base+list.filter(b=>isVehicle(b.mode)).length);
  return {used:vehicles,free:capacity-vehicles,people:approx+list.filter(b=>!isVehicle(b.mode)).length};
}
export function timeSlots(date, now=clock(), period='todos') {
  if(date<now.day) return [];
  return Array.from({length:48},(_,n)=>n*30)
    .filter(t=>(date!==now.day || t>now.minute) &&
      (period==='todos' || (period==='madrugada'&&t<360) || (period==='manha'&&t>=360&&t<720) || (period==='tarde'&&t>=720&&t<1080) || (period==='noite'&&t>=1080)))
    .map(formatTime);
}
export const normalPlate = s => s.toUpperCase().replace(/[^A-Z0-9]/g,'');
export const validPlate = s => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalPlate(s));
export const token = prefix => prefix+crypto.randomUUID().slice(0,8).toUpperCase();
export function makeBooking(db, args, now=clock()) {
  const {profile,mode,date,time,from,plate} = args;
  if (!db.profiles.some(p=>p.id===profile) || !modes[mode] || ![0,1].includes(from)) throw new Error('Confira o perfil e o transporte.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeSlots(date,now).includes(time)) throw new Error('Escolha um horário futuro disponível.');
  if (isVehicle(mode) && !validPlate(plate||'')) throw new Error('Informe uma placa válida, como ABC1D23.');
  const existing=db.bookings.find(b=>b.date===date && b.time===time && b.from===from &&
    (b.profile===profile || (isVehicle(mode)&&isVehicle(b.mode)&&b.plate===normalPlate(plate))));
  if(existing) throw new Error('Já existe uma reserva para este perfil ou placa nesse horário.');
  const counts=slotCounts(db.bookings,date,time,from);
  if(isVehicle(mode) && counts.free<1) throw new Error('Este horário lotou. Escolha outra saída.');
  const booking={id:token('BI-'),profile,mode,date,time,from,plate:isVehicle(mode)?normalPlate(plate):'',
    payment:isVehicle(mode)?'pendente':'isento',method:null,used:false,position:isVehicle(mode)?counts.used+1:null,created:Date.now()};
  db.bookings.unshift(booking);
  return booking;
}
export function gateCheck(db, {plate,date,time,from}) {
  const booking=db.bookings.find(b=>isVehicle(b.mode)&&b.plate===normalPlate(plate)&&b.date===date&&b.time===time&&b.from===from);
  if(!booking) return {ok:false, label:'Horário não agendado',detail:'A placa, o sentido e o horário precisam corresponder à reserva.'};
  if(booking.payment!=='pago') return {ok:false, label:'Pagamento pendente',detail:'A cancela permanece fechada até a confirmação do pagamento.'};
  if(booking.used) return {ok:false,label:'Embarque já validado',detail:'Esta autorização já foi utilizada.'};
  booking.used=true;
  return {ok:true,label:'Embarque validado',detail:'Placa, pagamento e horário conferidos. Cancela aberta.'};
}
export function cleanDB() {
  return {profiles:[],active:null,bookings:[],feedback:[],reads:{},scene:'regular'};
}
const dataKey='balsa-inteligente.app.v1';
let memory=cleanDB();
export function loadDB() {
  try {
    const value=localStorage.getItem(dataKey);
    return value?Object.assign(cleanDB(),JSON.parse(value)):memory;
  } catch {return memory;}
}
export async function changeDB(update) {
  const apply=()=>{
    const db=loadDB();const result=update(db);memory=db;
    try {localStorage.setItem(dataKey,JSON.stringify(db));} catch {}
    return result;
  };
  return globalThis.navigator?.locks?navigator.locks.request(dataKey,apply):apply();
}
export const getProfile = db => db.profiles.find(p=>p.id===db.active);
export const roleLabel = role => role==='morador'?'Morador':'Turista';
export const myTrips = (db,profile) => profile?db.bookings.filter(b=>b.profile===profile.id):[];
export const tripStatus = b => b.used?'Embarque validado':b.payment==='pendente'?'Pagamento pendente':'Embarque autorizado';
export const safe = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

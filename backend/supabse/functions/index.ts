import {serviceDb,authDb,json,preflight} from '../_shared/common.ts';
import {pushGoogleCalendar} from '../_shared/google_calendar.ts';
const DATE=/^\d{4}-\d{2}-\d{2}$/, TIME=/^\d{2}:\d{2}$/;
const MAX_SERVICES=6;
function recifeDate(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function recifeTime(){return new Intl.DateTimeFormat('en-GB',{timeZone:'America/Recife',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())}
Deno.serve(async(request:Request)=>{
  if(request.method==='OPTIONS')return preflight(request);
  if(request.method!=='POST')return json(request,{error:'Método inválido.'},405);
  try{
    const auth=request.headers.get('Authorization')||'';
    if(!auth.startsWith('Bearer '))return json(request,{error:'Entre na conta para agendar.'},401);
    const client=authDb(auth);const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return json(request,{error:'Sessão inválida.'},401);
    const body=await request.json();
    const date=body.date,time=body.time,ids=body.services;
    if(typeof date!=='string'||!DATE.test(date)||typeof time!=='string'||!TIME.test(time)||!Array.isArray(ids)||ids.length<1||ids.length>MAX_SERVICES)return json(request,{error:'Seleção de agendamento inválida.'},400);
    if(!ids.every((id:unknown)=>Number.isInteger(id)&&id>=1&&id<=6)||new Set(ids).size!==ids.length)return json(request,{error:'Selecione serviços válidos, sem repetir.'},400);
    const day=new Date(`${date}T12:00:00-03:00`);
    if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date||day.getUTCDay()===0||date<recifeDate())return json(request,{error:'A data selecionada está indisponível.'},400);
    const parts=time.split(':').map(Number),min=parts[0]*60+parts[1];
    if(parts[0]>23||parts[1]>59||min%15!==0)return json(request,{error:'Selecione um horário válido.'},400);
    const svc=serviceDb();const {data:catalog,error:svcErr}=await svc.from('services').select('id,name,price,duration').in('id',ids).eq('active',true);
    if(svcErr||catalog?.length!==ids.length)return json(request,{error:'Serviço indisponível.'},400);
    const items=ids.map((id:number)=>catalog!.find((x:{id:number})=>x.id===id)!);
    const duration=items.reduce((sum:number,s:{duration:number})=>sum+Number(s.duration),0);
    if(min<480||min+duration>1200)return json(request,{error:'O atendimento ultrapassa o horário de funcionamento.'},400);
    if(date===recifeDate()&&time<=recifeTime())return json(request,{error:'Este horário já passou.'},400);
    const startDate=new Date(`${date}T${time}:00-03:00`);
    if(Number.isNaN(startDate.getTime()))return json(request,{error:'Horário inválido.'},400);
    const endDate=new Date(startDate.getTime()+duration*60000);
    const {data:inserted,error:insertErr}=await svc.from('appointments').insert({
      customer_id:user.id,booking_date:date,booking_time:time,starts_at:startDate.toISOString(),ends_at:endDate.toISOString(),
      duration,service_items:items,total:items.reduce((sum:number,x:{price:number})=>sum+Number(x.price),0),status:'Agendado'
    }).select('*').single();
    if(insertErr){
      if(insertErr.code==='23P01'||insertErr.code==='23505')return json(request,{error:'O horário foi reservado por outra pessoa. Escolha outro.'},409);
      console.error('booking-db',insertErr);return json(request,{error:'Não foi possível registrar o agendamento.'},500)
    }
    let calendar_synced=false;
    if(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')&&Deno.env.get('GOOGLE_CALENDAR_ID')){
      try{
        const eventId=await pushGoogleCalendar(inserted);
        await svc.from('appointments').update({calendar_event_id:eventId,calendar_sync_error:null}).eq('id',inserted.id);
        calendar_synced=true;
      }catch(error){
        console.error('calendar-sync-pending',error);
        await svc.from('appointments').update({calendar_sync_error:'Pendente de sincronização; ver logs do Edge Function.'}).eq('id',inserted.id);
      }
    }
    return json(request,{ok:true,id:inserted.id,calendar_synced},201);
  }catch(e){console.error('create-booking',e);return json(request,{error:'Erro inesperado ao registrar agendamento.'},500)}
});

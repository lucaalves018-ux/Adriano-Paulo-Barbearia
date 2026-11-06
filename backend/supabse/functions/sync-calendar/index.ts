import {serviceDb,authDb,json,preflight} from '../_shared/common.ts';
import {pushGoogleCalendar} from '../_shared/google_calendar.ts';
Deno.serve(async(request:Request)=>{
  if(request.method==='OPTIONS')return preflight(request);
  if(request.method!=='POST')return json(request,{error:'Método inválido.'},405);
  const header=request.headers.get('Authorization')||'';
  if(!header.startsWith('Bearer '))return json(request,{error:'Não autorizado.'},401);
  try{
    const auth=authDb(header),{data:{user},error}=await auth.auth.getUser();
    if(error||!user)return json(request,{error:'Sessão inválida.'},401);
    const payload=JSON.parse(atob(header.split(' ')[1].split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    if(payload.aal!=='aal2')return json(request,{error:'Autenticação em dois fatores obrigatória.'},403);
    const svc=serviceDb();const {data:staff}=await svc.from('ap_staff_accounts').select('role').eq('user_id',user.id).maybeSingle();
    if(!staff||staff.role!=='admin')return json(request,{error:'Acesso exclusivo do administrador.'},403);
    const {data:bookings,error:listError}=await svc.from('ap_appointments').select('id,starts_at,ends_at,service_items').is('calendar_event_id',null).neq('status','Cancelado').limit(50);
    if(listError)throw listError;
    let synced=0,failed=0;
    for(const a of bookings||[]){
      try{
        const id=await pushGoogleCalendar(a);await svc.from('ap_appointments').update({calendar_event_id:id,calendar_sync_error:null}).eq('id',a.id);synced++;
      }catch(e){failed++;console.error('sync-item',a.id,e)}
    }
    return json(request,{ok:true,synced,failed});
  }catch(e){console.error('sync-calendar',e);return json(request,{error:'Erro sincronizando agenda. Verifique configurações e permissões.'},500)}
});

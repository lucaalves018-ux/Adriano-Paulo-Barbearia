import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
function headers(request:Request){
 const origin=request.headers.get('Origin')||'';
 const origins=(Deno.env.get('AP_APP_ORIGINS')||'https://lucaalves018-ux.github.io').split(',').map(x=>x.trim()).filter(Boolean);
 return {'Access-Control-Allow-Origin':origins.includes(origin)?origin:'','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
}
function result(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
function minute(iso:string){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Recife',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));return Number(m.hour)*60+Number(m.minute)}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return result(req,{error:'Método inválido.'},405);
 try{
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return result(req,{error:'Faça login para consultar a agenda.'},401);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return result(req,{error:'Sessão inválida.'},401);
  const payload=await req.json();const date=payload?.date;
  if(typeof date!=='string'||!(/^\d{4}-\d{2}-\d{2}$/).test(date))return result(req,{error:'Data inválida.'},400);
  const day=new Date(date+'T12:00:00-03:00');
  if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date)return result(req,{error:'Data inválida.'},400);
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Recife',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(date<today)return result(req,{error:'Data anterior à atual.'},400);
  const db=createClient(url,service,{auth:{persistSession:false}});
  const {data:items,error:dbError}=await db.from('ap_appointments').select('starts_at,ends_at').eq('booking_date',date).neq('status','Cancelado').limit(250);
  if(dbError){console.error(dbError);return result(req,{error:'Não foi possível consultar os horários.'},500)}
  const blocked=(items||[]).map(x=>[minute(x.starts_at),minute(x.ends_at)]);
  return result(req,{blocked});
 }catch(e){console.error('ap-availability',e);return result(req,{error:'Consulta indisponível.'},500)}
});

import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
export const config={
  url:Deno.env.get('SUPABASE_URL')!,
  publicKey:Deno.env.get('SUPABASE_ANON_KEY')!,
  serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
};
export function serviceDb(){return createClient(config.url,config.serviceKey,{auth:{persistSession:false}})}
export function authDb(authHeader:string){return createClient(config.url,config.publicKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}})}
export function cors(request:Request){
  const origin=request.headers.get('Origin')||'';
  const allowed=(Deno.env.get('APP_ORIGINS')||'').split(',').map(x=>x.trim()).filter(Boolean);
  const match=allowed.includes(origin)?origin:allowed[0]||'';
  return {'Access-Control-Allow-Origin':match,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS'};
}
export function json(request:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors(request),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
export function preflight(request:Request){return new Response(null,{status:204,headers:cors(request)})}

import {serviceDb,config,json,preflight} from '../_shared/common.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
Deno.serve(async(request:Request)=>{
  if(request.method==='OPTIONS')return preflight(request);
  if(request.method!=='POST')return json(request,{error:'Método inválido.'},405);
  try{
    const {username,password}=await request.json();
    if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>200)return json(request,{error:'Usuário ou senha incorretos.'},401);
    const svc=serviceDb();
    const {data:account}=await svc.from('ap_staff_accounts').select('user_id,email,role').eq('username',username.trim()).maybeSingle();
    if(!account)return json(request,{error:'Usuário ou senha incorretos.'},401);
    // Autenticação real com senha verificada pelo Supabase Auth; senha nunca é salva no index.html.
    const auth=createClient(config.url,config.publicKey,{auth:{persistSession:false}});
    const {data,error}=await auth.auth.signInWithPassword({email:account.email,password});
    if(error||!data.session||data.user?.id!==account.user_id)return json(request,{error:'Usuário ou senha incorretos.'},401);
    return json(request,{access_token:data.session.access_token,refresh_token:data.session.refresh_token,role:account.role});
  }catch(e){console.error('staff-login:',e);return json(request,{error:'Não foi possível autenticar.'},500)}
});

/** Google Calendar v3 via Service Account com agenda COMPARTILHADA explicitamente.
 *  Não coloque a chave no navegador, no GitHub ou no arquivo config.js.
 */
function b64url(value:Uint8Array|string){
  const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
  let bin='';for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function googleToken(){
  const input=Deno.env.get('AP_GOOGLE_SERVICE_ACCOUNT_JSON');
  if(!input)throw Error('Google Calendar não foi configurado.');
  const sa=JSON.parse(input) as {client_email:string;private_key:string};
  const base64=sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  const binary=atob(base64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const now=Math.floor(Date.now()/1000);
  const head=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const body=b64url(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/calendar.events',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const unsigned=`${head}.${body}`;
  const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const assertion=`${unsigned}.${b64url(signature)}`;
  const response=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!response.ok)throw Error(`Google OAuth: HTTP ${response.status}`);
  const data=await response.json();return data.access_token as string;
}
export type GoogleAppt={id:string;starts_at:string;ends_at:string;service_items:{name:string}[]};
export async function pushGoogleCalendar(a:GoogleAppt){
  const calendarId=Deno.env.get('AP_GOOGLE_CALENDAR_ID');
  if(!calendarId)throw Error('AP_GOOGLE_CALENDAR_ID não configurado.');
  const eventId='ap'+a.id.replaceAll('-','');
  const token=await googleToken();
  const event={id:eventId,summary:'Adriano Paulo Barbearia • '+a.service_items.map(x=>x.name).join(' + '),
    start:{dateTime:a.starts_at,timeZone:'America/Recife'},end:{dateTime:a.ends_at,timeZone:'America/Recife'},
    description:'Agendamento gerado pelo sistema Adriano Paulo Barbearia.'};
  const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(event)});
  // IDs determinísticos evitam duplicidade quando uma tentativa anterior foi bem sucedida mas a resposta falhou.
  if(response.status===409)return eventId;
  if(!response.ok)throw Error(`Google Calendar: HTTP ${response.status}`);
  return eventId;
}

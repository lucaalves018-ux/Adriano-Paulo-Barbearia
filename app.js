// Adriano Paulo Barbearia - app.js

const WEB='https://script.google.com/macros/s/AKfycbxSKS_TFJJAv79hi41klApJkGsd6XMMy2Ty8DRvMMhEcYSeH6sn4gCgEq-2QL_25UnbDw/exec';
const PIX_KEY='00020126330014BR.GOV.BCB.PIX0111161879944425204000053039865802BR5919Luca Alves da Silva6009SAO PAULO62140510eRr6kjOS4B63048BBF';
const services=[['Barba','R$ 20,00',20,'Preco pode variar.'],['Cabelo + barba','R$ 45,00',45,'Aparacao, modelagem e desenho da barba.'],['Corte','R$ 25,00',40,'Corte degrade e social.'],['Corte uma maquina so','R$ 20,00',20,'Preco pode variar.'],['Luzes/Reflexo','R$ 35,00',120,''],['Nevou','R$ 50,00',120,''],['Pigmentacao','R$ 10,00',20,'']];

const sel=document.querySelector('#service');
const cards=document.querySelector('#cards');

sel.innerHTML='<option value="">Selecione</option>'+services.map(s=>'<option value="'+s[0]+'">'+s[0]+' - '+s[1]+'</option>').join('');

cards.innerHTML=services.map(s=>'<div class="service" data-name="'+s[0]+'"><div style="display:flex;justify-content:space-between"><h3>'+s[0]+'</h3><b class="price">'+s[1]+'</b></div><p class="desc">'+(s[2]>=60?s[2]/60+' h':s[2]+' min')+(s[3]?' - '+s[3]:'')+'</p></div>').join('');

document.querySelectorAll('.service').forEach(c=>c.onclick=()=>{
  document.querySelectorAll('.service').forEach(x=>x.classList.remove('selected'));
  c.classList.add('selected');
  sel.value=c.dataset.name
});

const key='adriano-agendamentos';
const get=()=>JSON.parse(localStorage.getItem(key)||'[]');
const put=x=>localStorage.setItem(key,JSON.stringify(x));
const mins=t=>{let x=t.split(':').map(Number);return x[0]*60+x[1]};
const hoje=()=>new Date().toISOString().slice(0,10);

document.querySelector('#date').min=hoje();

const show=(txt,ok)=>{
  let s=document.querySelector('#status');
  s.textContent=txt;
  s.style.display='block';
  s.style.background=ok?'#dff7e6':'#ffe2e2';
  s.style.color=ok?'#155b2d':'#8b1515'
};

function copiarPix(){
  navigator.clipboard.writeText(PIX_KEY).then(()=>alert('Pix copiado! Faca o pagamento no seu banco e compartilhe o comprovante aqui.')).catch(()=>alert('Erro ao copiar'))
}

let comprovanteFile=null;
let agendamentoTemp=null;
const isIPhone=/iPhone/i.test(navigator.userAgent);

if(isIPhone){document.querySelector('#iphoneHelp').style.display='block'}

function saveState(){
  if(agendamentoTemp){localStorage.setItem('agendamentoTemp',JSON.stringify(agendamentoTemp))}
  if(comprovanteFile){localStorage.setItem('comprovanteNome',comprovanteFile.name)}
  localStorage.setItem('pixBoxVisible',document.querySelector('#pixBox').style.display)
}

function loadState(){
  const savedTemp=localStorage.getItem('agendamentoTemp');
  const savedFile=localStorage.getItem('comprovanteNome');
  const pixVisible=localStorage.getItem('pixBoxVisible');
  if(savedTemp){
    agendamentoTemp=JSON.parse(savedTemp);
    document.querySelector('#pixBox').style.display=pixVisible==='block'?'block':'none';
    if(agendamentoTemp){document.querySelector('#valorSinal').textContent='R$ '+agendamentoTemp.sinalValor}
    if(savedFile){
      comprovanteFile={name:savedFile};
      document.querySelector('#uploadBox').style.display='none';
      document.querySelector('#shareInfo').style.display='block';
      document.querySelector('#fileInfo').textContent='✅ '+savedFile;
      document.querySelector('#btnConfirmar').disabled=false;
      document.querySelector('#btnConfirmar').style.background='#4caf50';
      document.querySelector('#btnConfirmar').style.color='#fff';
      document.querySelector('#btnConfirmar').style.cursor='pointer';
      document.querySelector('#btnCancelar').style.display='block'
    }
  }
}

function toggleTerms(){
  const termsChecked=document.querySelector('#terms').checked;
  const btnPagar=document.querySelector('#btnPagar');
  btnPagar.style.display=termsChecked?'block':'none';
  btnPagar.disabled=!termsChecked
}

document.querySelector('#btnPagar').onclick=function(){
  const termsChecked=document.querySelector('#terms').checked;
  if(!termsChecked)return alert('Aceite o termo primeiro!');
  let s=sel.value;
  let n=document.querySelector('#name').value.trim();
  let d=document.querySelector('#date').value;
  let t=document.querySelector('#time').value;
  let o=document.querySelector('#obs').value.trim()||'Nenhuma';
  let item=services.find(x=>x[0]===s);
  let dur=item?item[2]:0;
  let valor=item?item[1]:'';
  if(!s)return alert('Selecione um servico.');
  if(!n||!d||!t)return alert('Preencha tudo.');
  let day=new Date(d+'T12:00').getDay();
  if(day===0)return alert('Nao atendemos aos domingos.');
  if(day===6){
    if(!((mins(t)>=mins('09:00')&&mins(t)+dur<=mins('13:00'))||(mins(t)>=mins('15:00')&&mins(t)+dur<=mins('19:00'))))return alert('Horario fora do expediente de sabado.')
  }else if(day>=2&&day<=5){
    if(!((mins(t)>=mins('09:00')&&mins(t)+dur<=mins('12:00'))||(mins(t)>=mins('14:30')&&mins(t)+dur<=mins('19:00'))))return alert('Horario fora do expediente.')
  }else if(day===1){
    if(!(mins(t)>=mins('14:30')&&mins(t)+dur<=mins('19:00')))return alert('Horario fora do expediente de segunda.')
  }
  if(get().some(a=>a.date===d&&mins(t)<mins(a.time)+a.duration&&mins(t)+dur>mins(a.time)))return alert('Horario ja ocupado.');
  let sinalPerc=0.20;
  let sinalValor=(parseFloat(valor.replace('R$','').replace(',','.').trim())*sinalPerc).toFixed(2).replace('.',',');
  agendamentoTemp={s,n,d,t,o,dur,valor,sinalValor};
  saveState();
  document.querySelector('#pixBox').style.display='block';
  document.querySelector('#pixKey').textContent=PIX_KEY;
  document.querySelector('#valorSinal').textContent='R$ '+sinalValor;
  document.querySelector('#btnCancelar').style.display='block';
  show('Faca o pagamento do sinal e compartilhe o comprovante aqui.',true)
};

document.querySelector('#btnCancelar').onclick=function(){
  if(confirm('Deseja cancelar este agendamento?')){
    agendamentoTemp=null;
    comprovanteFile=null;
    localStorage.removeItem('agendamentoTemp');
    localStorage.removeItem('comprovanteNome');
    localStorage.removeItem('pixBoxVisible');
    document.querySelector('#pixBox').style.display='none';
    document.querySelector('#uploadBox').style.display='block';
    document.querySelector('#shareInfo').style.display='none';
    document.querySelector('#btnCancelar').style.display='none';
    document.querySelector('#btnConfirmar').disabled=true;
    document.querySelector('#btnConfirmar').style.background='#999';
    document.querySelector('#btnConfirmar').style.color='#ccc';
    document.querySelector('#fileInfo').textContent='';
    show('Agendamento cancelado.',false)
  }
};

function fileSelected(file=null){
  const fileInput=document.querySelector('#comprovante');
  const fileInfo=document.querySelector('#fileInfo');
  const btnConfirmar=document.querySelector('#btnConfirmar');
  const uploadBox=document.querySelector('#uploadBox');
  const shareInfo=document.querySelector('#shareInfo');
  const selectedFile=file||fileInput.files[0];
  if(selectedFile){
    comprovanteFile=selectedFile;
    localStorage.setItem('comprovanteNome',selectedFile.name);
    fileInfo.textContent='✅ '+selectedFile.name;
    btnConfirmar.disabled=false;
    btnConfirmar.style.background='#4caf50';
    btnConfirmar.style.color='#fff';
    btnConfirmar.style.cursor='pointer';
    uploadBox.style.display='none';
    shareInfo.style.display='block';
    document.querySelector('#btnCancelar').style.display='block';
    saveState()
  }else{
    comprovanteFile=null;
    fileInfo.textContent='';
    btnConfirmar.disabled=true;
    btnConfirmar.style.background='#999';
    btnConfirmar.style.color='#ccc';
    btnConfirmar.style.cursor='not-allowed';
    uploadBox.style.display='block';
    shareInfo.style.display='none'
  }
}

document.querySelector('#btnConfirmar').onclick=function(){
  if(!comprovanteFile){alert('Selecione o comprovante primeiro!');return}
  if(!agendamentoTemp){alert('Erro! Preencha os dados novamente.');return}
  const{ s,n,d,t,o,dur,valor,sinalValor}=agendamentoTemp;
  let id=Date.now();
  let a={id:id,name:n,date:d,time:t,service:s,valor:valor,obs:o,duration:dur,sinal:sinalValor,pago:false,status:'pending'};
  put([...get(),a]);
  let fd=new Date(d+'T12:00').toLocaleDateString('pt-BR');
  let txt='Ola, Adriano Paulo Barbearia!\n\n*Novo agendamento*\n*Nome:* '+n+'\n*Servico:* '+s+'\n*Data:* '+fd+'\n*Horario:* '+t+'\n*Valor total:* '+valor+'\n*Sinal (20%):* R$ '+sinalValor+'\n*Observacao:* '+o+'\n\n*TERMOS:*\n- Sinal de 20% pago\n- Cancelamento com 30min de antecedencia\n- Sem reembolso em caso de falta\n- Apos 3 faltas perde agendamento com hora marcada\n\n📎*Envie o Comprovante aqui:* '+comprovanteFile.name;
  window.open('https://wa.me/5581989492224?text='+encodeURIComponent(txt),'_blank');
  document.querySelector('#pixBox').innerHTML='<b style="color:#4caf50">✅ Agendamento enviado!</b><p style="margin-top:8px;color:#aaa">Aguarde a confirmacao do barbeiro.</p>';
  document.querySelector('#btnConfirmar').disabled=true;
  document.querySelector('#btnConfirmar').textContent='✅ Enviado com sucesso!';
  document.querySelector('#btnPagar').style.display='none';
  document.querySelector('#btnCancelar').style.display='none';
  localStorage.removeItem('agendamentoTemp');
  localStorage.removeItem('comprovanteNome');
  localStorage.removeItem('pixBoxVisible')
};

window.addEventListener('load',async()=>{
  loadState();
  if('launchQueue' in window){
    launchQueue.setConsumer(async(launchParams)=>{
      if(launchParams.files&&launchParams.files.length>0){
        const file=await launchParams.files[0].getFile();
        comprovanteFile=file;
        fileSelected(file);
        if(agendamentoTemp){show('Comprovante recebido! Clique em Confirmar para enviar.',true)}
        else{show('Comprovante recebido! Preencha os dados e clique em Pagar 20%.',true)}
      }
    })
  }
});

const modal=document.querySelector('#modal');
document.querySelector('#menuBtn').onclick=()=>modal.classList.add('open');
document.querySelector('#closeBtn').onclick=()=>modal.classList.remove('open');
modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};

function render(){
  let list=get().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  document.querySelector('#report').innerHTML=list.length?list.map(a=>'<div class="appt" data-id="'+a.id+'"><div class="appt-info"><b>'+a.name+'</b> - '+a.service+'<br>'+new Date(a.date+'T12:00').toLocaleDateString('pt-BR')+' '+a.time+'<br>Valor: '+a.valor+(a.sinal?'<br>Sinal: R$ '+a.sinal:'')+'<br>OBS: '+a.obs+'</div><div class="status-badge '+(a.status==='done'?'status-done':'status-pending')+'" data-id="'+a.id+'" title="'+(a.status==='done'?'Concluido':'Pendente')+'" onclick="toggleStatus(this,'+a.id+')"></div><button class="del" data-id="'+a.id+'" onclick="deleteAppt(this,'+a.id+')">Excluir</button></div>').join(''):'Nenhum.';
  renderDashboard()
}

function toggleStatus(el,id){
  let list=get();
  let idx=list.findIndex(a=>a.id==id);
  if(idx>=0){
    list[idx].status=list[idx].status==='pending'?'done':'pending';
    put(list);
    render()
  }
}

function deleteAppt(el,id){
  if(!confirm('Excluir este agendamento?'))return;
  el.disabled=true;
  el.classList.add('del-wait');
  el.textContent='Excluindo...';
  try{
    let params=new URLSearchParams({acao:'excluir',id:id});
    fetch(WEB,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});
    put(get().filter(a=>String(a.id)!==String(id)));
    render()
  }catch(e){alert('Erro ao excluir')}
  finally{
    el.disabled=false;
    el.classList.remove('del-wait');
    el.textContent='Excluir'
  }
}

function renderDashboard(){
  const now=new Date();
  const month=now.getMonth();
  const year=now.getFullYear();
  let list=get().filter(a=>{
    let d=new Date(a.date+'T12:00');
    return d.getMonth()===month&&d.getFullYear()===year&&a.status==='done'
  });
  let servicos={};
  let total=0;
  list.forEach(a=>{
    if(!servicos[a.service])servicos[a.service]={count:0,total:0};
    servicos[a.service].count++;
    servicos[a.service].total+=parseFloat(a.valor.replace('R$','').replace(',','.').trim());
    total+=servicos[a.service].total
  });
  let html='';
  for(let s in servicos){
    html+='<div class="dash-item"><span>'+s+' ('+servicos[s].count+'x)</span><span>R$ '+servicos[s].total.toFixed(2).replace('.',',')+'</span></div>'
  }
  if(html==='')html='<p class="empty">Nenhum servico concluido este mes.</p>';
  else html+='<div class="dash-total"><span>Total</span><span>R$ '+total.toFixed(2).replace('.',',')+'</span></div>';
  document.querySelector('#dashContent').innerHTML=html;
  document.querySelector('#dashboard').style.display=list.length||Object.keys(servicos).length?'block':'none'
}

document.querySelector('#loginForm').onsubmit=e=>{
  e.preventDefault();
  if(user.value==='Adri@n08850'&&pass.value==='ADR5529'){
    login.style.display='none';
    reportPanel.style.display='block';
    render()
  }else err.style.display='block'
};

if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js')}

# Adriano Paulo Barbearia — Supabase conectado (2026-11-06)

## Projeto escolhido

**Projeto:** `equipezero-web's Project`  
**Project ID:** `fqisewatypluagngmgka`  
**URL:** `https://fqisewatypluagngmgka.supabase.co`

ATENÇÃO: Este projeto TAMBÉM hospeda dados da L&A Royal Advisory. Para evitar colisões, **TODAS as tabelas criadas para a barbearia têm prefixo `ap_`**. As Edge Functions também têm prefixo `ap-`. Os buckets são `ap-shop-photos` e `ap-avatars`. O banco Supabase Auth, as URLs de redirecionamento e o SMTP continuam compartilhados entre os aplicativos.

## Já concluído diretamente no Supabase

- [x] Criadas e verificadas 8 tabelas independentes: `ap_profiles`, `ap_staff_accounts`, `ap_services`, `ap_plans`, `ap_shop_settings`, `ap_shop_photos`, `ap_shop_reviews`, `ap_appointments`.
- [x] Ativada RLS e criadas as políticas correspondentes nas tabelas novas.
- [x] Cadastrados os seis serviços com preços e durações solicitados e três planos iniciais.
- [x] Adicionado bloqueio de intervalos que se sobrepõem para um único barbeiro, diretamente no Postgres.
- [x] Criado gatilho específico de cadastro para `app_id='adriano_paulo'`, sem alterar o perfil das contas existentes da L&A.
- [x] Habilitado cadastro de perfil no primeiro acesso caso o cliente já tenha uma conta Supabase no projeto compartilhado.
- [x] Criados buckets separados: `ap-shop-photos` e `ap-avatars`.
- [x] Publicadas Edge Functions: `ap-staff-login` (login interno), `ap-create-booking` (reserva), `ap-availability` (horários ocupados) e `ap-sync-calendar` (Google Agenda).
- [x] `config.js` de produção já contém URL e chave **pública** do projeto. Não precisa colar secrets.

## O que VOCÊ precisa fazer antes de abrir para clientes

### 1. Criar contas reais ADM e Recepção

No painel Supabase: Authentication → Users → Add user.

Crie **duas contas diferentes**, cada uma com e-mail real que possa receber mensagens de recuperação, usando **novas senhas**. As senhas antigas já constaram em código publicamente acessível; não as reutilize.

Após criar os usuários, abra SQL Editor e execute, substituindo os e-mails abaixo pelos e-mails reais:

```sql
insert into public.ap_staff_accounts(user_id,username,email,role)
select id,'Adri@no8809',email,'admin'
from auth.users where email='EMAIL_REAL_DO_ADM'
on conflict(user_id) do update
 set username=excluded.username,email=excluded.email,role=excluded.role;

insert into public.ap_staff_accounts(user_id,username,email,role)
select id,'Recp!88@1!',email,'reception'
from auth.users where email='EMAIL_REAL_DA_RECEPCAO'
on conflict(user_id) do update
 set username=excluded.username,email=excluded.email,role=excluded.role;
```

Se cada comando inserir zero registros, revise o e-mail digitado e confirme que a conta foi criada em Authentication → Users.

### 2. Permitir links de confirmação e recuperação

No projeto Supabase, abra Authentication → URL Configuration.

**NÃO altere indiscriminadamente a `Site URL` principal**, pois ela também afeta a L&A Royal Advisory. Apenas acrescente a URL real da barbearia à lista **Redirect URLs**, por exemplo:

- `https://lucaalves018-ux.github.io/Adriano-Paulo-Barbearia/`
- `https://lucaalves018-ux.github.io/Adriano-Paulo-Barbearia/index.html`

Configure/valide o envio de e-mails; alterações de SMTP também são compartilhadas com os outros aplicativos do projeto.

### 3. Google Agenda (opcional até que a conta Google esteja configurada)

Na Google Cloud, habilite Google Calendar API, crie uma **service account**, gere um JSON privado e compartilhe o calendário da barbearia com o e-mail dessa conta de serviço na permissão de editar eventos.

No Supabase em Edge Functions → Secrets, cadastre os segredos **exclusivos da barbearia**:

- `AP_GOOGLE_CALENDAR_ID`: ID do calendário
- `AP_GOOGLE_SERVICE_ACCOUNT_JSON`: JSON inteiro da service account
- `AP_APP_ORIGINS`: `https://lucaalves018-ux.github.io` (opcional; essa origem já é a padrão das quatro funções)

**Nunca publique secrets no GitHub nem mande senhas/JSON privados no chat.** Sem esses segredos, o agendamento é salvo no banco, mas o Google Agenda ainda não sincroniza.

### 4. Publicar no GitHub Pages

O repositório `lucaalves018-ux/Adriano-Paulo-Barbearia` está conectado **somente para leitura**. Faça upload manual dos seguintes arquivos da pasta raiz do pacote:

- `index.html`
- `config.js`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-maskable-512.png`

**Não publique `demonstracao.html`, `config-demo.js` ou a pasta `backend` como arquivos públicos do GitHub Pages.** A pasta `backend` fica no pacote completo para referência/desenvolvimento.

### 5. Teste antes de divulgar

1. Cadastro de cliente com e-mail e confirmação por mensagem.
2. Login do ADM por `Adri@no8809` e a **senha nova cadastrada no Supabase**; ativar 2FA TOTP.
3. Login da Recepção por `Recp!88@1!` e a **senha nova cadastrada no Supabase**; ativar 2FA TOTP.
4. Criar agendamento e verificar se, em outra conta, os horários sobrepostos estão indisponíveis.
5. Editar nome e descrição de um plano no ADM e verificar no catálogo.
6. Verificar recuperação de senha com e-mail real.
7. Após configurar os segredos da Google Cloud, confirmar criação de evento no Google Agenda.

## Observações de segurança e verificação

- Alterações no **projeto e no banco** foram realmente realizadas e conferidas pelas ferramentas do Supabase. As quatro funções têm estado ACTIVE (o que **não** significa teste de ponta a ponta com usuário real).
- O projeto continua compartilhando **Supabase Auth** com a L&A. As tabelas e políticas são isoladas, mas para autenticação totalmente separada entre os dois negócios será necessário um projeto Supabase dedicado.
- A URL de frontend ainda precisa ser publicada no GitHub e testada com navegador, dados e e-mail reais.
- Os testes de entrega de e-mails, 2FA real, OAuth Google e criação de reservas a partir de dois dispositivos **não foram realizados**.
- O projeto já tinha advertências do Advisor em partes da L&A; não alteramos aquelas estruturas.
- `backend/supabase/schema.sql` fica **apenas como cópia de referência** da migração executada. **Não execute novamente** em um projeto já configurado, porque duplicaria políticas.

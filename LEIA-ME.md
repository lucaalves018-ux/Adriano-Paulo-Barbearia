# Adriano Paulo — autenticação da equipe por Secrets

## O que foi atualizado no backend
- Função Supabase `ap-staff-login` (versão 3) publicada no projeto `fqisewatypluagngmgka`.
- Login de ADM e Recepção por usuário e senha configurados **somente** no secret `AP_STAFF_ACCOUNTS`.
- Identidades técnicas da equipe são criadas automaticamente no Supabase Auth no primeiro login válido.
- É obrigatório definir senhas **novas e fortes, com no mínimo 12 caracteres**; as anteriores foram divulgadas no histórico e não devem ser reutilizadas.
- Tabela `ap_staff_login_limiter` e função `ap_staff_login_attempt` limitam tentativas de senha.
- Após o login, a equipe precisa configurar/verificar autenticação TOTP (2FA).
- Cliente continua a criar conta com e-mail e senha no site.

## O que você precisa fazer
1. Abra o projeto Supabase `fqisewatypluagngmgka`, menu **Edge Functions → Secrets**.
2. Adicione a chave `AP_STAFF_ACCOUNTS` com o JSON abaixo; substitua as senhas EXEMPLO por senhas novas e fortes, **não copie valores de senha ilustrativos como senhas definitivas**:

```json
{
  "admin": { "username": "USUARIO_ADMIN_ESCOLHIDO", "password": "SENHA_NOVA_FORTE_COM_12_OU_MAIS_CARACTERES" },
  "reception": { "username": "USUARIO_RECEPCAO_ESCOLHIDO", "password": "OUTRA_SENHA_NOVA_FORTE_COM_12_OU_MAIS_CARACTERES" }
}
```

3. Salve o secret. Não o coloque no GitHub, no `config.js` nem envie senhas no chat.
4. Substitua apenas `index.html` e `sw.js` na raiz do repositório. O `config.js` atual permanece o mesmo.
5. Teste ADM/Recepção (2FA obrigatório). A primeira tentativa válida provisionará as identidades técnicas no Auth automaticamente.
6. Para o ADM Geral, crie **uma conta real com seu próprio e-mail** em Authentication → Users. Depois associe sua conta à função admin usando o SQL abaixo, substituindo apenas o e-mail:

```sql
insert into public.ap_staff_accounts (user_id, username, email, role)
select id, 'super_admin', email, 'admin'
from auth.users
where lower(email)=lower('SEU_EMAIL_REAL_AQUI')
on conflict(user_id) do update set role='admin';
```

7. O ADM Geral entrará no site **por e-mail e senha** e precisará ativar o 2FA. Recepção e ADM usam **usuário e senha**.

### Atenção
- O secret ainda precisa ser configurado manualmente. Sem ele, o login interno retorna 503; não há valores padrão.
- A interface da Recepção tem apenas permissões operacionais; o Supabase RLS protege o acesso aos dados.
- O projeto Supabase é compartilhado com a L&A. O Auth é compartilhado, mas as tabelas da Barbearia usam prefixo `ap_`.
- Alterar a senha no secret atualiza o acesso no próximo login válido. Para revogar sessões já emitidas, é necessário encerrar as sessões dessas identidades no Supabase.
- O GitHub conectado ao ChatGPT tem permissão somente de leitura. Estes arquivos não foram publicados automaticamente.

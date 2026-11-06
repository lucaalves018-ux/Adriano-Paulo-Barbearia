-- Adriano Paulo Barbearia | Estrutura isolada por prefixo ap_ no Supabase compartilhado.
-- Não altera dados existentes da L&A Royal Advisory.
-- Autenticação: auth.users / MFA por TOTP; agendamento: Edge Function create-booking.

create schema if not exists private;

create table if not exists public.ap_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  birth date,
  source text,
  cpf text,
  cep text,
  street text,
  house_number text,
  district text,
  city text,
  state text,
  complement text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ap_staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null unique,
  role text not null check (role in ('admin','reception')),
  created_at timestamptz not null default now()
);

create table if not exists public.ap_services (
  id smallint primary key,
  name text not null,
  price numeric(10,2) not null check(price >= 0),
  duration integer not null check(duration between 5 and 480),
  active boolean not null default true
);
insert into public.ap_services (id,name,price,duration) values
  (1,'Corte de Cabelo',25,40),
  (2,'Barba',20,20),
  (3,'Cabelo + Barba',45,45),
  (4,'Corte uma Maquina',20,20),
  (5,'Luzes ou Reflexo',35,120),
  (6,'Nevou',50,120)
on conflict (id) do update set name=excluded.name,price=excluded.price,duration=excluded.duration;

create table if not exists public.ap_plans (
  id smallint primary key,
  name text not null,
  description text not null,
  price numeric(10,2) not null check(price >= 0),
  vacancies integer not null default 0 check(vacancies >= 0),
  subscribers integer not null default 0 check(subscribers >= 0),
  best boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.ap_plans (id,name,description,price,vacancies,subscribers,best) values
  (1,'Corte ILIMITADO','Cortes de cabelo conforme as condições do plano.',74.90,5,0,true),
  (2,'Corte e Barba ILIMITADO','Corte de cabelo e barba conforme as condições do plano.',129.90,2,0,false),
  (3,'Barba ILIMITADA','Cuidados de barba conforme as condições do plano.',89.90,4,0,false)
on conflict (id) do nothing;

create table if not exists public.ap_shop_settings (
  id smallint primary key default 1 check(id = 1),
  title text not null,
  description text not null,
  second_title text not null,
  second_description text not null,
  updated_at timestamptz not null default now()
);
insert into public.ap_shop_settings(id,title,description,second_title,second_description) values
  (1,'Sobre a Adriano Paulo Barbearia','Um espaço dedicado ao cuidado pessoal, com atenção aos detalhes e atendimento individualizado.',
   'Nossa proposta','Valorizar o seu estilo em cada atendimento, com um ambiente acolhedor e serviços realizados com precisão.')
on conflict (id) do nothing;

create table if not exists public.ap_shop_photos (
  id bigint generated always as identity primary key,
  url text not null,
  object_path text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ap_shop_reviews (
  id bigint generated always as identity primary key,
  body text not null check(char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.ap_appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ap_profiles(user_id),
  booking_date date not null,
  booking_time time not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration integer not null check(duration > 0 and duration <= 720),
  service_items jsonb not null check(jsonb_typeof(service_items) = 'array'),
  total numeric(10,2) not null check(total >= 0),
  status text not null default 'Agendado' check(status in ('Agendado','Confirmado','Concluído','Cancelado')),
  completed_at timestamptz,
  calendar_event_id text,
  calendar_sync_error text,
  created_at timestamptz not null default now(),
  constraint ends_after_start check(ends_at > starts_at),
  constraint only_one_barber_no_overlap EXCLUDE USING gist (
    tstzrange(starts_at,ends_at,'[)') WITH &&
  ) WHERE (status <> 'Cancelado')
);
create index if not exists appointments_customer_idx on public.ap_appointments(customer_id,booking_date desc);
create index if not exists appointments_day_idx on public.ap_appointments(booking_date,booking_time);

-- Criar perfil automaticamente após cadastro no Supabase Auth.
-- Esta função é de gatilho, em schema não exposto, e nunca atribui privilégios.
create or replace function private.create_ap_profile_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Somente novos usuários que se registrarem pela Adriano Paulo Barbearia.
  if coalesce(new.raw_user_meta_data->>'app_id','') <> 'adriano_paulo' then
    return new;
  end if;
  insert into public.ap_profiles(user_id,email,full_name,phone,birth,source)
  values(new.id,coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    nullif(new.raw_user_meta_data->>'birth','')::date,
    new.raw_user_meta_data->>'source')
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke all on function private.create_ap_profile_on_signup() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_ap on auth.users;
create trigger on_auth_user_created_ap after insert on auth.users
for each row execute function private.create_ap_profile_on_signup();

alter table public.ap_profiles enable row level security;
alter table public.ap_staff_accounts enable row level security;
alter table public.ap_services enable row level security;
alter table public.ap_plans enable row level security;
alter table public.ap_shop_settings enable row level security;
alter table public.ap_shop_photos enable row level security;
alter table public.ap_shop_reviews enable row level security;
alter table public.ap_appointments enable row level security;

-- Um funcionário só pode ser elevado por um administrador de banco/service_role.
create policy staff_own_read on public.ap_staff_accounts for select to authenticated
using(user_id=(select auth.uid()));

-- Perfis: cliente vê/edita apenas seu; equipe com MFA vê dados necessários aos agendamentos.
create policy profiles_read_self_or_staff on public.ap_profiles for select to authenticated
using (
  user_id=(select auth.uid()) or
  ((auth.jwt()->>'aal')='aal2' and exists(
    select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid())
    and s.role in ('admin','reception')
  ))
);
create policy profiles_update_self on public.ap_profiles for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy services_public_read on public.ap_services for select to anon, authenticated using(active=true);
create policy plans_public_read on public.ap_plans for select to anon, authenticated using(true);
create policy plans_admin_edit on public.ap_plans for update to authenticated
using((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'))
with check((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy shop_settings_public_read on public.ap_shop_settings for select to anon, authenticated using(true);
create policy shop_settings_admin_edit on public.ap_shop_settings for update to authenticated
using((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'))
with check((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy shop_photos_public_read on public.ap_shop_photos for select to anon, authenticated using(true);
create policy shop_photos_admin_insert on public.ap_shop_photos for insert to authenticated
with check((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy shop_photos_admin_delete on public.ap_shop_photos for delete to authenticated
using((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy shop_reviews_public_read on public.ap_shop_reviews for select to anon, authenticated using(true);
create policy shop_reviews_admin_insert on public.ap_shop_reviews for insert to authenticated
with check((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy shop_reviews_admin_delete on public.ap_shop_reviews for delete to authenticated
using((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy appointments_read_self_or_staff on public.ap_appointments for select to authenticated
using(customer_id=(select auth.uid()) or
  ((auth.jwt()->>'aal')='aal2' and exists(
   select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role in ('admin','reception')
  )));
create policy appointments_staff_complete on public.ap_appointments for update to authenticated
using((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role in ('admin','reception')))
with check((auth.jwt()->>'aal')='aal2' and exists(select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role in ('admin','reception')));

-- Data API: acesso mínimo + RLS. Booking somente por Edge Function com service_role.
revoke all on public.ap_staff_accounts from anon, authenticated;
grant select on public.ap_staff_accounts to authenticated;
grant select on public.ap_profiles to authenticated;
grant update(full_name,phone,birth,cpf,cep,street,house_number,district,city,state,complement,avatar_url) on public.ap_profiles to authenticated;
grant select on public.ap_services,public.ap_plans,public.ap_shop_settings,public.ap_shop_photos,public.ap_shop_reviews to anon,authenticated;
grant update(name,description,price,vacancies,subscribers) on public.ap_plans to authenticated;
grant update(title,description,second_title,second_description) on public.ap_shop_settings to authenticated;
grant insert,delete on public.ap_shop_photos,public.ap_shop_reviews to authenticated;
grant select on public.ap_appointments to authenticated;
grant update(status,completed_at) on public.ap_appointments to authenticated;

-- Buckets: imagens públicas, mas escrita restrita a conta proprietária ou ADM com MFA.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('ap-shop-photos','ap-shop-photos',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('ap-avatars','ap-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy adriano_staff_shop_upload on storage.objects for insert to authenticated
with check(bucket_id='ap-shop-photos' and (auth.jwt()->>'aal')='aal2' and exists(
  select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy adriano_staff_shop_delete on storage.objects for delete to authenticated
using(bucket_id='ap-shop-photos' and (auth.jwt()->>'aal')='aal2' and exists(
  select 1 from public.ap_staff_accounts s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy adriano_avatar_insert on storage.objects for insert to authenticated
with check(bucket_id='ap-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Leitura de arquivos de imagem dos buckets públicos (os arquivos são públicos por definição).
create policy adriano_storage_image_read on storage.objects for select to anon, authenticated
using(bucket_id in ('ap-shop-photos','ap-avatars'));

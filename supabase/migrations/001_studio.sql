-- Run once in the Supabase SQL editor, or use `supabase db push`.
-- The service-role key is server-only. Never grant it to a browser.
begin;
create extension if not exists pgcrypto;
create table public.clinics (
  id uuid primary key default gen_random_uuid(), name text not null, phone text not null default '050-1234567',
  city text not null default 'תל אביב', description text not null default '', color text not null default '#6d7969' check(color ~ '^#[0-9a-fA-F]{6}$'),
  logo_path text check(logo_path is null or (logo_path like (id::text||'/%') and position('..' in logo_path)=0)), suspended boolean not null default false, created_at timestamptz not null default now()
);
create table public.memberships (user_id uuid primary key references auth.users(id) on delete cascade, clinic_id uuid not null references public.clinics(id));
create table public.platform_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.subscriptions (
  clinic_id uuid primary key references public.clinics(id), plan text not null default 'starter' check(plan in ('starter','pro')),
  allowance integer not null default 30 check(allowance>=0), bonus integer not null default 0 check(bonus>=0), used integer not null default 0 check(used>=0),
  cycle_start timestamptz not null default now(), cycle_end timestamptz not null default (now()+interval '1 month'),
  status text not null default 'trial' check(status in ('trial','active','suspended')), check(cycle_end>cycle_start)
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id),
  title text not null check(char_length(title) between 2 and 100), service text not null, objective text not null,
  price text not null default '', second_offer text not null default '', style text not null, audience text not null,
  notes text not null default '', direction text not null default '', headline text not null, subheadline text not null default '',
  cta text not null default 'לתיאום פגישת ייעוץ', phone text not null, overlay_color text not null default '#6d7969',
  text_color text not null default '#ffffff', alignment text not null default 'right' check(alignment in ('right','center','left')),
  text_position integer not null default 0 check(text_position between 0 and 40), layout text not null default 'bottom' check(layout in ('bottom','center','top')),
  format text not null default 'post' check(format in ('post','story','square')), active_asset_id uuid, created_at timestamptz not null default now(), unique(id,clinic_id)
);
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, campaign_id uuid not null, idempotency_key uuid not null,
  prompt_inputs jsonb not null, prompt text not null, prompt_version text not null,
  status text not null default 'pending' check(status in ('pending','succeeded','failed')), credit_consumed integer not null default 1 check(credit_consumed in (0,1)),
  error text, cycle_start timestamptz not null, created_at timestamptz not null default now(),
  unique(clinic_id,idempotency_key), unique(id,clinic_id), foreign key(campaign_id,clinic_id) references public.campaigns(id,clinic_id)
);
create table public.campaign_assets (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, campaign_id uuid not null, generation_id uuid,
  path text not null, kind text not null check(kind in ('ai','demo')), created_at timestamptz not null default now(),
  unique(id,clinic_id), foreign key(campaign_id,clinic_id) references public.campaigns(id,clinic_id), foreign key(generation_id,clinic_id) references public.ai_generations(id,clinic_id)
);
alter table public.campaigns add constraint campaign_active_asset foreign key(active_asset_id,clinic_id) references public.campaign_assets(id,clinic_id) deferrable initially deferred;
create table public.landing_pages (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, campaign_id uuid unique not null, slug text unique not null,
  headline text not null, subheadline text not null default '', benefits jsonb not null default '[]', faq jsonb not null default '[]',
  cta text not null, color text not null default '#6d7969', published boolean not null default false, created_at timestamptz not null default now(),
  foreign key(campaign_id,clinic_id) references public.campaigns(id,clinic_id)
);
create table public.leads (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null, campaign_id uuid not null, name text not null, phone text not null,
  email text not null default '', status text not null default 'new' check(status in ('new','contacted','appointment','not_interested','no_answer')),
  notes text not null default '', consent boolean not null check(consent=true), created_at timestamptz not null default now(),
  foreign key(campaign_id,clinic_id) references public.campaigns(id,clinic_id)
);
create table public.brand_assets(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),path text not null,created_at timestamptz not null default now());
create table public.usage_events(id uuid primary key default gen_random_uuid(),clinic_id uuid not null references public.clinics(id),generation_id uuid references public.ai_generations(id),amount integer not null,kind text not null check(kind in ('generation','refund','admin_grant')),created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,count integer not null,resets_at timestamptz not null);
create index leads_clinic_date on public.leads(clinic_id,created_at desc);
create index campaigns_clinic_date on public.campaigns(clinic_id,created_at desc);
create index generation_clinic_status on public.ai_generations(clinic_id,status,created_at);
create index assets_campaign on public.campaign_assets(campaign_id,clinic_id);
create index usage_clinic_date on public.usage_events(clinic_id,created_at desc);

create function public.current_clinic() returns uuid language sql stable security definer set search_path=public as $$ select clinic_id from public.memberships where user_id=auth.uid() $$;
create function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.platform_admins where user_id=auth.uid()) $$;
create function public.on_signup() returns trigger language plpgsql security definer set search_path=public as $$
declare c uuid;
begin
  insert into public.clinics(name) values(left(coalesce(nullif(new.raw_user_meta_data->>'clinic_name',''),'הקליניקה שלי'),100)) returning id into c;
  insert into public.memberships(user_id,clinic_id) values(new.id,c);
  insert into public.subscriptions(clinic_id) values(c);
  return new;
end $$;
create trigger studio_signup after insert on auth.users for each row execute function public.on_signup();

-- No client mutation of membership, admin status, subscription counters or generation ledger.
alter table public.clinics enable row level security;
alter table public.memberships enable row level security;
alter table public.platform_admins enable row level security;
alter table public.subscriptions enable row level security;
alter table public.campaigns enable row level security;
alter table public.ai_generations enable row level security;
alter table public.campaign_assets enable row level security;
alter table public.landing_pages enable row level security;
alter table public.leads enable row level security;
alter table public.brand_assets enable row level security;
alter table public.usage_events enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.clinics,public.memberships,public.platform_admins,public.subscriptions,public.campaigns,public.ai_generations,public.campaign_assets,public.landing_pages,public.leads,public.brand_assets,public.usage_events,public.rate_limits from anon,authenticated;
grant select on public.clinics,public.memberships,public.platform_admins,public.subscriptions,public.campaigns,public.ai_generations,public.campaign_assets,public.landing_pages,public.leads,public.brand_assets,public.usage_events to authenticated;
grant update(name,phone,city,description,color,logo_path) on public.clinics to authenticated;
grant update(headline,subheadline,price,cta,phone,overlay_color,text_color,alignment,text_position,layout,format,active_asset_id) on public.campaigns to authenticated;
grant update(headline,subheadline,benefits,faq,cta,color,published) on public.landing_pages to authenticated;
grant update(status,notes) on public.leads to authenticated;
grant insert on public.brand_assets to authenticated;
create policy own_membership on public.memberships for select to authenticated using(user_id=auth.uid());
create policy own_admin_status on public.platform_admins for select to authenticated using(user_id=auth.uid());
create policy own_clinic_read on public.clinics for select to authenticated using(id=public.current_clinic());
create policy own_clinic_update on public.clinics for update to authenticated using(id=public.current_clinic()) with check(id=public.current_clinic());
create policy own_subscription on public.subscriptions for select to authenticated using(clinic_id=public.current_clinic());
create policy own_campaign_read on public.campaigns for select to authenticated using(clinic_id=public.current_clinic());
create policy own_campaign_update on public.campaigns for update to authenticated using(clinic_id=public.current_clinic()) with check(clinic_id=public.current_clinic());
create policy own_generation on public.ai_generations for select to authenticated using(clinic_id=public.current_clinic());
create policy own_assets on public.campaign_assets for select to authenticated using(clinic_id=public.current_clinic());
create policy own_landing_read on public.landing_pages for select to authenticated using(clinic_id=public.current_clinic());
create policy own_landing_update on public.landing_pages for update to authenticated using(clinic_id=public.current_clinic()) with check(clinic_id=public.current_clinic());
create policy own_lead_read on public.leads for select to authenticated using(clinic_id=public.current_clinic());
create policy own_lead_update on public.leads for update to authenticated using(clinic_id=public.current_clinic()) with check(clinic_id=public.current_clinic());
create policy own_brand_read on public.brand_assets for select to authenticated using(clinic_id=public.current_clinic());
create policy own_brand_insert on public.brand_assets for insert to authenticated with check(clinic_id=public.current_clinic() and path like (public.current_clinic()::text||'/%'));
create policy own_usage on public.usage_events for select to authenticated using(clinic_id=public.current_clinic());

create function public.create_campaign(p_campaign jsonb,p_landing jsonb) returns void language plpgsql security definer set search_path=public as $$
declare c uuid:=public.current_clinic(); v_id uuid:=(p_campaign->>'id')::uuid;
begin
  if c is null then raise exception 'unauthorized'; end if;
  insert into public.campaigns(id,clinic_id,title,service,objective,price,second_offer,style,audience,notes,direction,headline,subheadline,cta,phone,overlay_color)
  values(v_id,c,p_campaign->>'title',p_campaign->>'service',p_campaign->>'objective',p_campaign->>'price',p_campaign->>'second_offer',p_campaign->>'style',p_campaign->>'audience',p_campaign->>'notes',p_campaign->>'direction',p_campaign->>'headline',p_campaign->>'subheadline',p_campaign->>'cta',p_campaign->>'phone',p_campaign->>'overlay_color');
  insert into public.landing_pages(id,clinic_id,campaign_id,slug,headline,subheadline,benefits,faq,cta,color)
  values((p_landing->>'id')::uuid,c,v_id,'campaign-'||v_id::text,p_landing->>'headline',p_landing->>'subheadline',p_landing->'benefits',p_landing->'faq',p_landing->>'cta',p_landing->>'color');
end $$;

create function public.refresh_clinic_cycle(p_clinic uuid) returns void language plpgsql security definer set search_path=public as $$
declare s public.subscriptions; g public.ai_generations; v_start timestamptz; v_end timestamptz;
begin
  select * into s from public.subscriptions where clinic_id=p_clinic for update;
  if not found then raise exception 'subscription_missing'; end if;
  if s.cycle_end<=now() then
    v_start:=s.cycle_end;v_end:=v_start+interval '1 month';
    while v_end<=now() loop v_start:=v_end;v_end:=v_start+interval '1 month';end loop;
    update public.subscriptions set used=0,bonus=0,cycle_start=v_start,cycle_end=v_end where clinic_id=p_clinic;
    s.cycle_start:=v_start;
  end if;
  for g in select * from public.ai_generations where clinic_id=p_clinic and status='pending' and created_at<now()-interval '15 minutes' for update loop
    update public.ai_generations set status='failed',credit_consumed=0,error='reservation_expired' where id=g.id;
    if g.cycle_start=s.cycle_start then update public.subscriptions set used=greatest(0,used-1) where clinic_id=p_clinic;end if;
    insert into public.usage_events(clinic_id,generation_id,amount,kind) values(p_clinic,g.id,-1,'refund');
  end loop;
end $$;
create function public.refresh_cycle() returns void language plpgsql security definer set search_path=public as $$
declare c uuid:=public.current_clinic();
begin if c is null then raise exception 'unauthorized';end if;perform public.refresh_clinic_cycle(c);end $$;
create function public.reserve_generation(p_campaign uuid,p_key uuid,p_prompt text,p_inputs jsonb,p_version text) returns jsonb language plpgsql security definer set search_path=public as $$
declare c uuid:=public.current_clinic();s public.subscriptions;g public.ai_generations;
begin
  if c is null or not exists(select 1 from public.campaigns where id=p_campaign and clinic_id=c) then raise exception 'unauthorized';end if;
  if exists(select 1 from public.clinics where id=c and suspended) then raise exception 'account_suspended';end if;
  -- All reservation / reset / completion / refund operations take the subscription lock first.
  perform public.refresh_clinic_cycle(c);
  select * into s from public.subscriptions where clinic_id=c for update;
  select * into g from public.ai_generations where clinic_id=c and idempotency_key=p_key;
  if found then
    if g.campaign_id<>p_campaign then raise exception 'idempotency_conflict';end if;
    return to_jsonb(g)||jsonb_build_object('reused',true);
  end if;
  if s.status='suspended' then raise exception 'account_suspended';end if;
  if s.used>=s.allowance+s.bonus then raise exception 'limit_reached';end if;
  update public.subscriptions set used=used+1 where clinic_id=c;
  insert into public.ai_generations(clinic_id,campaign_id,idempotency_key,prompt_inputs,prompt,prompt_version,cycle_start)
  values(c,p_campaign,p_key,p_inputs,p_prompt,p_version,s.cycle_start) returning * into g;
  insert into public.usage_events(clinic_id,generation_id,amount,kind) values(c,g.id,1,'generation');
  return to_jsonb(g);
end $$;
create function public.complete_generation(p_generation uuid,p_asset uuid,p_path text) returns void language plpgsql security definer set search_path=public as $$
declare g public.ai_generations;c uuid;
begin
  select clinic_id into c from public.ai_generations where id=p_generation;
  perform 1 from public.subscriptions where clinic_id=c for update;
  select * into g from public.ai_generations where id=p_generation for update;
  if g.id is null or g.status<>'pending' or p_path<>(g.clinic_id::text||'/'||g.id::text||'.png') then raise exception 'invalid_generation';end if;
  insert into public.campaign_assets(id,clinic_id,campaign_id,generation_id,path,kind) values(p_asset,g.clinic_id,g.campaign_id,g.id,p_path,'ai');
  update public.campaigns set active_asset_id=p_asset where id=g.campaign_id and clinic_id=g.clinic_id;
  update public.ai_generations set status='succeeded' where id=g.id;
end $$;
create function public.fail_generation(p_generation uuid) returns void language plpgsql security definer set search_path=public as $$
declare g public.ai_generations;c uuid;
begin
  select clinic_id into c from public.ai_generations where id=p_generation;
  perform 1 from public.subscriptions where clinic_id=c for update;
  select * into g from public.ai_generations where id=p_generation for update;
  if g.id is null or g.status<>'pending' then return;end if;
  update public.ai_generations set status='failed',credit_consumed=0,error='provider_failed' where id=g.id;
  update public.subscriptions set used=greatest(0,used-1) where clinic_id=g.clinic_id and cycle_start=g.cycle_start;
  insert into public.usage_events(clinic_id,generation_id,amount,kind) values(g.clinic_id,g.id,-1,'refund');
end $$;
create function public.check_rate_limit(p_key text,p_limit integer,p_window integer) returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  -- Expired buckets contain only hashed IP keys, and are removed opportunistically.
  delete from public.rate_limits where resets_at<now()-interval '1 day';
  insert into public.rate_limits values(p_key,1,now()+make_interval(secs=>p_window))
  on conflict(key) do update set count=case when rate_limits.resets_at<=now() then 1 else rate_limits.count+1 end,
  resets_at=case when rate_limits.resets_at<=now() then now()+make_interval(secs=>p_window) else rate_limits.resets_at end returning count into v_count;
  return v_count<=p_limit;
end $$;
create function public.admin_accounts() returns jsonb language plpgsql security definer set search_path=public as $$
declare v_clinic record;
begin
  if not public.is_platform_admin() then raise exception 'forbidden';end if;
  for v_clinic in select id from public.clinics order by id loop perform public.refresh_clinic_cycle(v_clinic.id);end loop;
  return coalesce((select jsonb_agg(row_to_json(a)) from (select c.id,c.name,c.suspended,s.plan,s.status,s.used,s.allowance,s.bonus,
  (select count(*) from public.ai_generations g where g.clinic_id=c.id and g.status='succeeded' and g.created_at>=date_trunc('month',now())) as monthly_generations
  from public.clinics c join public.subscriptions s on s.clinic_id=c.id order by s.used desc) a),'[]'::jsonb);
end $$;
create function public.admin_update_clinic(p_clinic uuid,p_credits integer,p_suspended boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden';end if;
  if p_credits<0 or p_credits>1000 then raise exception 'invalid_credits';end if;
  perform public.refresh_clinic_cycle(p_clinic);
  if p_credits>0 then
    update public.subscriptions set bonus=bonus+p_credits where clinic_id=p_clinic;
    insert into public.usage_events(clinic_id,amount,kind) values(p_clinic,p_credits,'admin_grant');
  end if;
  if p_suspended is not null then update public.clinics set suspended=p_suspended where id=p_clinic;end if;
end $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; explicitly restrict every definer RPC.
revoke all on function public.on_signup(),public.current_clinic(),public.is_platform_admin(),public.create_campaign(jsonb,jsonb),public.refresh_clinic_cycle(uuid),public.refresh_cycle(),public.reserve_generation(uuid,uuid,text,jsonb,text),public.complete_generation(uuid,uuid,text),public.fail_generation(uuid),public.check_rate_limit(text,integer,integer),public.admin_accounts(),public.admin_update_clinic(uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.current_clinic(),public.is_platform_admin(),public.create_campaign(jsonb,jsonb),public.refresh_cycle(),public.reserve_generation(uuid,uuid,text,jsonb,text),public.admin_accounts(),public.admin_update_clinic(uuid,integer,boolean) to authenticated;
grant execute on function public.complete_generation(uuid,uuid,text),public.fail_generation(uuid),public.check_rate_limit(text,integer,integer) to service_role;
grant all on public.clinics,public.memberships,public.platform_admins,public.subscriptions,public.campaigns,public.ai_generations,public.campaign_assets,public.landing_pages,public.leads,public.brand_assets,public.usage_events,public.rate_limits to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('studio-assets','studio-assets',false,30000000,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
-- No direct client storage policies. Images are served through the checked application route.
commit;

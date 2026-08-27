create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  type text not null default 'general',
  action_type text not null default 'general',
  action_metadata jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop function if exists public.create_notification(uuid, text, text, text, text, jsonb);

create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text default 'general',
  p_action_type text default 'general',
  p_action_metadata jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  created_notification public.notifications;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
  values (p_user_id, p_title, p_body, p_type, p_action_type, coalesce(p_action_metadata, '{}'::jsonb))
  returning * into created_notification;

  return created_notification;
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function public.notify_new_listing(p_property_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  listing public.properties;
  notified_count integer;
begin
  select * into listing from public.properties where id = p_property_id;
  if listing.id is null or auth.uid() is distinct from listing.user_id then
    raise exception 'Only the listing owner can send listing alerts';
  end if;

  insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
  select distinct saved_by.user_id,
    'New listing in your area',
    format('%s is now available in %s.', listing.title, coalesce(listing.city, listing.state, 'your area')),
    'listing',
    'view_property',
    jsonb_build_object('property_id', listing.id)
  from public.favorites saved_by
  join public.properties saved_listing on saved_listing.id = saved_by.property_id
  where saved_by.user_id <> listing.user_id
    and ((listing.city is not null and lower(saved_listing.city) = lower(listing.city))
      or (listing.state is not null and lower(saved_listing.state) = lower(listing.state)));

  get diagnostics notified_count = row_count;
  return notified_count;
end;
$$;

grant execute on function public.notify_new_listing(uuid) to authenticated;

drop function if exists public.resolve_property_offer(uuid, public.property_offer_status);

create or replace function public.resolve_property_offer(
  p_offer_id uuid,
  p_status public.property_offer_status
)
returns public.property_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_offer public.property_offers;
  other_offer record;
begin
  select * into selected_offer
  from public.property_offers
  where id = p_offer_id
  for update;

  if selected_offer.id is null then
    raise exception 'Offer not found';
  end if;
  if auth.uid() is distinct from selected_offer.landlord_id
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only the landlord or an admin can resolve this offer';
  end if;

  update public.property_offers
  set status = p_status
  where id = p_offer_id
  returning * into selected_offer;

  if p_status = 'accepted' then
    for other_offer in
      update public.property_offers
      set status = 'rejected'
      where property_id = selected_offer.property_id
        and id <> selected_offer.id
        and status = 'pending'
      returning buyer_id, offer_amount
    loop
      insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
      values (
        other_offer.buyer_id,
        'Offer no longer available',
        'The property received and accepted another offer, so your pending offer is no longer available.',
        'offer',
        'view_property',
        jsonb_build_object('property_id', selected_offer.property_id)
      );
    end loop;
  end if;

  return selected_offer;
end;
$$;

grant execute on function public.resolve_property_offer(uuid, public.property_offer_status) to authenticated;

alter table public.notifications replica identity full;

-- Realtime delivers the new row to NotificationBell immediately.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

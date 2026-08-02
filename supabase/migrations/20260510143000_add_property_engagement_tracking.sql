do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_engagement_event_type') then
    create type public.property_engagement_event_type as enum ('listing_click', 'detail_view');
  end if;
end $$;

create table if not exists public.property_engagement_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  viewer_id uuid references auth.users(id) on delete set null,
  event_type public.property_engagement_event_type not null,
  created_at timestamptz not null default now()
);

alter table public.property_engagement_events enable row level security;

drop policy if exists "Anyone can insert engagement events" on public.property_engagement_events;
create policy "Anyone can insert engagement events"
on public.property_engagement_events
for insert
with check (true);

drop policy if exists "Landlords can view own engagement events" on public.property_engagement_events;
create policy "Landlords can view own engagement events"
on public.property_engagement_events
for select
using (
  exists (
    select 1
    from public.properties
    where properties.id = property_engagement_events.property_id
      and properties.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view all engagement events" on public.property_engagement_events;
create policy "Admins can view all engagement events"
on public.property_engagement_events
for select
using (public.has_role(auth.uid(), 'admin'));

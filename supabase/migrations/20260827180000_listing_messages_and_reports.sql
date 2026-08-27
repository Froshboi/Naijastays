do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_message_kind') then
    create type public.listing_message_kind as enum ('landlord_chat', 'admin_contact', 'listing_report');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_message_status') then
    create type public.listing_message_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
  end if;
end $$;

create table if not exists public.listing_messages (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  landlord_id uuid references auth.users(id) on delete set null,
  kind public.listing_message_kind not null default 'landlord_chat',
  subject text not null,
  body text not null,
  phone text,
  status public.listing_message_status not null default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_messages enable row level security;

create index if not exists listing_messages_property_id_idx
  on public.listing_messages(property_id);

create index if not exists listing_messages_sender_id_idx
  on public.listing_messages(sender_id);

create index if not exists listing_messages_landlord_id_idx
  on public.listing_messages(landlord_id);

create index if not exists listing_messages_status_created_at_idx
  on public.listing_messages(status, created_at desc);

drop policy if exists "Users can create listing messages" on public.listing_messages;
create policy "Users can create listing messages"
on public.listing_messages
for insert
to authenticated
with check (auth.uid() = sender_id);

drop policy if exists "Participants can view listing messages" on public.listing_messages;
create policy "Participants can view listing messages"
on public.listing_messages
for select
to authenticated
using (
  auth.uid() = sender_id
  or auth.uid() = landlord_id
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Admins can update listing messages" on public.listing_messages;
create policy "Admins can update listing messages"
on public.listing_messages
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists update_listing_messages_updated_at on public.listing_messages;
create trigger update_listing_messages_updated_at
before update on public.listing_messages
for each row execute function public.update_updated_at_column();

drop function if exists public.notify_admins_listing_message(uuid);

create or replace function public.notify_admins_listing_message(p_message_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  msg public.listing_messages;
  listing_title text;
  sent_count integer;
begin
  select * into msg from public.listing_messages where id = p_message_id;

  if msg.id is null or auth.uid() is distinct from msg.sender_id then
    raise exception 'Only the message sender can send this alert';
  end if;

  select title into listing_title from public.properties where id = msg.property_id;

  insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
  select roles.user_id,
    case
      when msg.kind = 'listing_report' then 'New listing report'
      when msg.kind = 'admin_contact' then 'New admin contact request'
      else 'New listing chat message'
    end,
    format('%s: %s', coalesce(listing_title, 'A listing'), left(msg.body, 180)),
    'message',
    'view_admin_message',
    jsonb_build_object('message_id', msg.id, 'property_id', msg.property_id, 'kind', msg.kind)
  from public.user_roles roles
  where roles.role = 'admin';

  get diagnostics sent_count = row_count;
  return sent_count;
end;
$$;

grant execute on function public.notify_admins_listing_message(uuid) to authenticated;

create or replace function public.notify_listing_message_review_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and (old.status is distinct from new.status or old.admin_note is distinct from new.admin_note)
    and auth.uid() is not null
    and public.has_role(auth.uid(), 'admin') then
      insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
      values (
        new.sender_id,
        'Admin review updated',
        coalesce(nullif(new.admin_note, ''), format('Your message is now marked %s.', new.status)),
        'message',
        'view_property',
        jsonb_build_object('message_id', new.id, 'property_id', new.property_id, 'status', new.status)
      );

      if new.landlord_id is not null and new.landlord_id <> new.sender_id then
        insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
        values (
          new.landlord_id,
          'Listing message review updated',
          coalesce(nullif(new.admin_note, ''), format('A message linked to your listing is now marked %s.', new.status)),
          'message',
          'view_listing_message',
          jsonb_build_object('message_id', new.id, 'property_id', new.property_id, 'status', new.status)
        );
      end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listing_messages_review_update_notify on public.listing_messages;
create trigger listing_messages_review_update_notify
after update on public.listing_messages
for each row execute function public.notify_listing_message_review_update();

alter table public.listing_messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.listing_messages;
exception
  when duplicate_object then null;
end $$;

alter table public.listing_messages
  add column if not exists parent_id uuid references public.listing_messages(id) on delete cascade,
  add column if not exists sender_read_at timestamptz,
  add column if not exists landlord_read_at timestamptz,
  add column if not exists admin_read_at timestamptz;

alter table public.notifications
  drop constraint if exists notifications_action_type_check;

alter table public.notifications
  add constraint notifications_action_type_check
  check (length(trim(action_type)) > 0);

create index if not exists listing_messages_parent_id_idx
  on public.listing_messages(parent_id, created_at);

drop policy if exists "Users can create listing messages" on public.listing_messages;
drop policy if exists "Participants can create listing messages" on public.listing_messages;
create policy "Participants can create listing messages"
on public.listing_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and (
    parent_id is null
    or exists (
      select 1
      from public.listing_messages parent
      where parent.id = public.listing_messages.parent_id
        and (
          auth.uid() = parent.sender_id
          or auth.uid() = parent.landlord_id
          or public.has_role(auth.uid(), 'admin')
        )
    )
  )
);

drop policy if exists "Admins can update listing messages" on public.listing_messages;
drop policy if exists "Participants can update listing messages" on public.listing_messages;
create policy "Participants can update listing messages"
on public.listing_messages
for update
to authenticated
using (
  auth.uid() = sender_id
  or auth.uid() = landlord_id
  or public.has_role(auth.uid(), 'admin')
)
with check (
  auth.uid() = sender_id
  or auth.uid() = landlord_id
  or public.has_role(auth.uid(), 'admin')
);

create or replace function public.notify_listing_message_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  root_message public.listing_messages;
  listing_title text;
  recipient_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into root_message
  from public.listing_messages
  where id = new.parent_id;

  if root_message.id is null then
    return new;
  end if;

  select title into listing_title
  from public.properties
  where id = root_message.property_id;

  for recipient_id in
    select distinct recipient
    from unnest(array[
      root_message.sender_id,
      root_message.landlord_id
    ]) as recipients(recipient)
    where recipient is not null
      and recipient <> new.sender_id
  loop
    insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
    values (
      recipient_id,
      'New chat message',
      format('%s: %s', coalesce(listing_title, 'Listing chat'), left(new.body, 180)),
      'message',
      'open_chat_thread',
      jsonb_build_object(
        'property_id', root_message.property_id,
        'thread_id', root_message.id,
        'message_id', new.id
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists listing_messages_reply_notify on public.listing_messages;
create trigger listing_messages_reply_notify
after insert on public.listing_messages
for each row execute function public.notify_listing_message_reply();

alter table public.listing_messages replica identity full;

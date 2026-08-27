-- Upgrade the existing notifications table before using the newer columns.
-- The table may already exist from an earlier schema version.
alter table public.notifications
  add column if not exists body text not null default '';

alter table public.notifications
  add column if not exists action_type text not null default 'general';

alter table public.notifications
  add column if not exists action_metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  add column if not exists email_sent boolean not null default false;

alter table public.notifications
  add column if not exists email_sent_at timestamptz;

alter table public.booking_requests
  add column if not exists booking_reference text;

alter table public.properties
  add column if not exists payment_method text;
alter table public.properties
  add column if not exists payment_details text;

update public.booking_requests
set booking_reference = 'NS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where booking_reference is null;

alter table public.booking_requests
  alter column booking_reference set default ('NS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));
alter table public.booking_requests
  alter column booking_reference set not null;

create unique index if not exists booking_requests_reference_key
  on public.booking_requests(booking_reference);

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications for delete
using (auth.uid() = user_id);

drop function if exists public.confirm_booking(uuid);

create or replace function public.confirm_booking(p_booking_id uuid)
returns public.booking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmed_booking public.booking_requests;
  conflicting_booking record;
  conflicting_offer record;
begin
  select * into confirmed_booking
  from public.booking_requests
  where id = p_booking_id
  for update;

  if confirmed_booking.id is null then
    raise exception 'Booking request not found';
  end if;
  if auth.uid() is distinct from confirmed_booking.landlord_id
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only the landlord or an admin can confirm this booking';
  end if;
  if confirmed_booking.status <> 'pending' then
    raise exception 'This booking request has already been decided';
  end if;

  update public.booking_requests
  set status = 'confirmed'
  where id = p_booking_id
  returning * into confirmed_booking;

  update public.properties
  set status = 'booked'
  where id = confirmed_booking.property_id;

  for conflicting_booking in
    update public.booking_requests
    set status = 'declined'
    where property_id = confirmed_booking.property_id
      and id <> confirmed_booking.id
      and status = 'pending'
    returning guest_id
  loop
    insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
    values (
      conflicting_booking.guest_id,
      'Booking no longer available',
      'This property has been booked by another guest, so your pending request is no longer available.',
      'booking',
      'view_property',
      jsonb_build_object('property_id', confirmed_booking.property_id)
    );
  end loop;

  for conflicting_offer in
    update public.property_offers
    set status = 'rejected'
    where property_id = confirmed_booking.property_id
      and status = 'pending'
    returning buyer_id
  loop
    insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
    values (
      conflicting_offer.buyer_id,
      'Listing no longer available',
      'This property has been booked, so new offers are no longer being accepted.',
      'offer',
      'view_property',
      jsonb_build_object('property_id', confirmed_booking.property_id)
    );
  end loop;

  return confirmed_booking;
end;
$$;

grant execute on function public.confirm_booking(uuid) to authenticated;

-- One-time product update notice for users who already have accounts.
insert into public.notifications (user_id, title, body, type, action_type)
select id,
  'NaijaStays booking update',
  'Bookings now include a reference number, confirmed properties are held until released, and you can manage notifications from the bell.',
  'system',
  'general'
from auth.users;

alter table public.booking_requests replica identity full;

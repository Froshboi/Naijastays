drop function if exists public.notify_admins_new_booking(uuid);

create or replace function public.notify_admins_new_booking(p_booking_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  booking public.booking_requests;
  property_title text;
  sent_count integer;
begin
  select * into booking from public.booking_requests where id = p_booking_id;
  if booking.id is null or auth.uid() is distinct from booking.guest_id then
    raise exception 'Only the booking guest can send this alert';
  end if;

  select title into property_title from public.properties where id = booking.property_id;

  insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
  select roles.user_id,
    'New booking request to review',
    format('Booking %s for %s is waiting for a landlord response. Guest phone: %s.', booking.booking_reference, coalesce(property_title, 'a property'), coalesce(booking.phone, 'not supplied')),
    'booking',
    'review_booking',
    jsonb_build_object('booking_id', booking.id, 'booking_reference', booking.booking_reference, 'property_id', booking.property_id)
  from public.user_roles roles
  where roles.role = 'admin';

  get diagnostics sent_count = row_count;
  return sent_count;
end;
$$;

grant execute on function public.notify_admins_new_booking(uuid) to authenticated;

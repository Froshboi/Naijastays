drop function if exists public.broadcast_notification(text, text, text);

create or replace function public.broadcast_notification(
  p_audience text,
  p_title text,
  p_body text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sent_count integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin access required';
  end if;
  if p_audience not in ('everyone', 'landlords', 'users') then
    raise exception 'Invalid notification audience';
  end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_body), '') is null then
    raise exception 'Title and message are required';
  end if;

  insert into public.notifications (user_id, title, body, type, action_type, action_metadata)
  select users.id, trim(p_title), trim(p_body), 'admin_update', 'general', '{}'::jsonb
  from auth.users users
  where p_audience = 'everyone'
    or (p_audience = 'landlords' and public.has_role(users.id, 'landlord'))
    or (p_audience = 'users'
      and not public.has_role(users.id, 'landlord')
      and not public.has_role(users.id, 'admin'));

  get diagnostics sent_count = row_count;
  return sent_count;
end;
$$;

grant execute on function public.broadcast_notification(text, text, text) to authenticated;

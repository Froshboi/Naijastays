-- Align the checked-in schema with the current property and admin UI.
alter table public.properties
  add column if not exists status text not null default 'available',
  add column if not exists video_url text;

update public.properties
set status = coalesce(status, 'available')
where status is null;

alter table public.properties
  drop constraint if exists properties_status_check;

alter table public.properties
  add constraint properties_status_check
  check (status in ('available', 'booked', 'occupied'));

drop policy if exists "Admins can delete properties" on public.properties;

create policy "Admins can delete properties"
on public.properties
for delete
using (public.has_role(auth.uid(), 'admin'));

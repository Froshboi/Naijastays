do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_offer_status') then
    create type public.property_offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_request_status') then
    create type public.booking_request_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'protection_case_status') then
    create type public.protection_case_status as enum ('open', 'investigating', 'resolved', 'dismissed');
  end if;
end $$;

create table if not exists public.property_offers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete cascade not null,
  landlord_id uuid references auth.users(id) on delete cascade not null,
  offer_amount bigint not null check (offer_amount > 0),
  financing_type text,
  phone text,
  message text,
  status public.property_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.property_offers enable row level security;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  guest_id uuid references auth.users(id) on delete cascade not null,
  landlord_id uuid references auth.users(id) on delete cascade not null,
  booking_type text not null,
  check_in_date date not null,
  check_out_date date,
  guests_count integer default 1,
  requested_term_months integer,
  phone text,
  notes text,
  total_quote bigint not null default 0,
  status public.booking_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.booking_requests enable row level security;

create table if not exists public.protection_cases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  requester_id uuid references auth.users(id) on delete cascade not null,
  landlord_id uuid references auth.users(id) on delete set null,
  related_offer_id uuid references public.property_offers(id) on delete set null,
  related_booking_id uuid references public.booking_requests(id) on delete set null,
  category text not null,
  phone text,
  summary text not null,
  details text,
  priority text not null default 'medium',
  status public.protection_case_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.protection_cases enable row level security;

drop policy if exists "Buyers can insert property offers" on public.property_offers;
create policy "Buyers can insert property offers"
on public.property_offers
for insert
with check (auth.uid() = buyer_id);

drop policy if exists "Buyers can view own property offers" on public.property_offers;
create policy "Buyers can view own property offers"
on public.property_offers
for select
using (auth.uid() = buyer_id);

drop policy if exists "Landlords can view own property offers" on public.property_offers;
create policy "Landlords can view own property offers"
on public.property_offers
for select
using (auth.uid() = landlord_id);

drop policy if exists "Landlords can update own property offers" on public.property_offers;
create policy "Landlords can update own property offers"
on public.property_offers
for update
using (auth.uid() = landlord_id)
with check (auth.uid() = landlord_id);

drop policy if exists "Admins can view all property offers" on public.property_offers;
create policy "Admins can view all property offers"
on public.property_offers
for select
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update all property offers" on public.property_offers;
create policy "Admins can update all property offers"
on public.property_offers
for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Guests can insert booking requests" on public.booking_requests;
create policy "Guests can insert booking requests"
on public.booking_requests
for insert
with check (auth.uid() = guest_id);

drop policy if exists "Guests can view own booking requests" on public.booking_requests;
create policy "Guests can view own booking requests"
on public.booking_requests
for select
using (auth.uid() = guest_id);

drop policy if exists "Landlords can view own booking requests" on public.booking_requests;
create policy "Landlords can view own booking requests"
on public.booking_requests
for select
using (auth.uid() = landlord_id);

drop policy if exists "Landlords can update own booking requests" on public.booking_requests;
create policy "Landlords can update own booking requests"
on public.booking_requests
for update
using (auth.uid() = landlord_id)
with check (auth.uid() = landlord_id);

drop policy if exists "Admins can view all booking requests" on public.booking_requests;
create policy "Admins can view all booking requests"
on public.booking_requests
for select
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update all booking requests" on public.booking_requests;
create policy "Admins can update all booking requests"
on public.booking_requests
for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users can insert protection cases" on public.protection_cases;
create policy "Users can insert protection cases"
on public.protection_cases
for insert
with check (auth.uid() = requester_id);

drop policy if exists "Users can view own protection cases" on public.protection_cases;
create policy "Users can view own protection cases"
on public.protection_cases
for select
using (auth.uid() = requester_id);

drop policy if exists "Landlords can view protection cases on own listings" on public.protection_cases;
create policy "Landlords can view protection cases on own listings"
on public.protection_cases
for select
using (auth.uid() = landlord_id);

drop policy if exists "Admins can view all protection cases" on public.protection_cases;
create policy "Admins can view all protection cases"
on public.protection_cases
for select
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update all protection cases" on public.protection_cases;
create policy "Admins can update all protection cases"
on public.protection_cases
for update
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists update_property_offers_updated_at on public.property_offers;
create trigger update_property_offers_updated_at
before update on public.property_offers
for each row execute function public.update_updated_at_column();

drop trigger if exists update_booking_requests_updated_at on public.booking_requests;
create trigger update_booking_requests_updated_at
before update on public.booking_requests
for each row execute function public.update_updated_at_column();

drop trigger if exists update_protection_cases_updated_at on public.protection_cases;
create trigger update_protection_cases_updated_at
before update on public.protection_cases
for each row execute function public.update_updated_at_column();

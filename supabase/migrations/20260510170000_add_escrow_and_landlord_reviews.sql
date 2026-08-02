do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'escrow_payment_status'
  ) then
    create type public.escrow_payment_status as enum (
      'pending',
      'confirmed',
      'released',
      'refunded',
      'failed',
      'cancelled'
    );
  end if;
end
$$;

create table if not exists public.escrow_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_id uuid not null,
  landlord_id uuid not null,
  booking_request_id uuid null references public.booking_requests(id) on delete set null,
  amount_naira bigint not null check (amount_naira > 0),
  payment_channel text not null default 'naira',
  payment_method text null,
  payment_reference text null,
  screenshot_url text null,
  payer_name text null,
  payer_phone text null,
  note text null,
  status public.escrow_payment_status not null default 'pending',
  release_notes text null
);

create unique index if not exists escrow_payments_payment_reference_key
  on public.escrow_payments(payment_reference)
  where payment_reference is not null;

create index if not exists escrow_payments_landlord_id_idx
  on public.escrow_payments(landlord_id);

create index if not exists escrow_payments_tenant_id_idx
  on public.escrow_payments(tenant_id);

create index if not exists escrow_payments_property_id_idx
  on public.escrow_payments(property_id);

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'landlord_review_status'
  ) then
    create type public.landlord_review_status as enum (
      'published',
      'hidden'
    );
  end if;
end
$$;

create table if not exists public.landlord_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  landlord_id uuid not null,
  property_id uuid null references public.properties(id) on delete set null,
  reviewer_id uuid not null,
  booking_request_id uuid null references public.booking_requests(id) on delete set null,
  reviewer_name text null,
  rating integer not null check (rating between 1 and 5),
  review text null,
  status public.landlord_review_status not null default 'published'
);

create unique index if not exists landlord_reviews_reviewer_scope_key
  on public.landlord_reviews(landlord_id, property_id, reviewer_id);

create index if not exists landlord_reviews_landlord_id_idx
  on public.landlord_reviews(landlord_id);

create index if not exists landlord_reviews_property_id_idx
  on public.landlord_reviews(property_id);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_escrow_payments_updated_at on public.escrow_payments;
create trigger set_escrow_payments_updated_at
before update on public.escrow_payments
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_landlord_reviews_updated_at on public.landlord_reviews;
create trigger set_landlord_reviews_updated_at
before update on public.landlord_reviews
for each row
execute function public.set_current_timestamp_updated_at();

create or replace function public.refresh_landlord_rating(target_landlord_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_rating numeric;
  review_count integer;
begin
  select
    round(avg(rating)::numeric, 2),
    count(*)
  into avg_rating, review_count
  from public.landlord_reviews
  where landlord_id = target_landlord_id
    and status = 'published';

  update public.properties
  set
    rating = coalesce(avg_rating, 0),
    reviews_count = coalesce(review_count, 0)
  where user_id = target_landlord_id;
end;
$$;

create or replace function public.handle_landlord_review_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_landlord_rating(old.landlord_id);
    return old;
  end if;

  perform public.refresh_landlord_rating(new.landlord_id);

  if tg_op = 'UPDATE' and old.landlord_id is distinct from new.landlord_id then
    perform public.refresh_landlord_rating(old.landlord_id);
  end if;

  return new;
end;
$$;

drop trigger if exists landlord_reviews_refresh_landlord_rating on public.landlord_reviews;
create trigger landlord_reviews_refresh_landlord_rating
after insert or update or delete on public.landlord_reviews
for each row
execute function public.handle_landlord_review_change();

alter table public.escrow_payments enable row level security;
alter table public.landlord_reviews enable row level security;

drop policy if exists "Tenants can create escrow payments" on public.escrow_payments;
create policy "Tenants can create escrow payments"
on public.escrow_payments
for insert
to authenticated
with check (auth.uid() = tenant_id);

drop policy if exists "Tenants can view own escrow payments" on public.escrow_payments;
create policy "Tenants can view own escrow payments"
on public.escrow_payments
for select
to authenticated
using (auth.uid() = tenant_id);

drop policy if exists "Landlords can view escrow payments on their properties" on public.escrow_payments;
create policy "Landlords can view escrow payments on their properties"
on public.escrow_payments
for select
to authenticated
using (auth.uid() = landlord_id);

drop policy if exists "Admins can manage escrow payments" on public.escrow_payments;
create policy "Admins can manage escrow payments"
on public.escrow_payments
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Public can read published landlord reviews" on public.landlord_reviews;
create policy "Public can read published landlord reviews"
on public.landlord_reviews
for select
using (status = 'published');

drop policy if exists "Users can submit their landlord reviews" on public.landlord_reviews;
create policy "Users can submit their landlord reviews"
on public.landlord_reviews
for insert
to authenticated
with check (auth.uid() = reviewer_id);

drop policy if exists "Users can update their landlord reviews" on public.landlord_reviews;
create policy "Users can update their landlord reviews"
on public.landlord_reviews
for update
to authenticated
using (auth.uid() = reviewer_id or public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = reviewer_id or public.has_role(auth.uid(), 'admin'));

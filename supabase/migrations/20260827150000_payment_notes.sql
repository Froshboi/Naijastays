alter table public.promotion_payments
  add column if not exists admin_note text;

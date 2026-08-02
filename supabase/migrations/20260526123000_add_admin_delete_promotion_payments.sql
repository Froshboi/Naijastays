drop policy if exists "Admins can delete promotion payments" on public.promotion_payments;

create policy "Admins can delete promotion payments"
on public.promotion_payments
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

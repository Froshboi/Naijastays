-- Drop the view if it exists to avoid column renaming issues
drop view if exists public.admin_dashboard;

-- Create a single admin dashboard view for the frontend to fetch
create view public.admin_dashboard as
with pending_payments as (
  select
    pp.id,
    pp.plan,
    pp.amount_naira,
    pp.payment_method,
    pp.payment_reference,
    pp.status,
    pp.screenshot_url,
    pp.created_at,
    pp.property_id,
    pp.user_id as requester_id,
    p.title as property_title,
    p.city as property_city,
    p.state as property_state,
    p.user_id as owner_id,
    owner.full_name as owner_name,
    owner.phone as owner_phone
  from promotion_payments pp
  join properties p on p.id = pp.property_id
  left join profiles owner on owner.user_id = p.user_id
  where pp.status = 'pending'
),
pending_applications as (
  select
    la.id,
    la.user_id,
    la.role_requested,
    la.status,
    la.message,
    la.created_at,
    pr.full_name,
    pr.phone,
    pr.avatar_url,
    array_agg(distinct ur.role) filter (where ur.role is not null) as existing_roles
  from landlord_applications la
  left join profiles pr on pr.user_id = la.user_id
  left join user_roles ur on ur.user_id = la.user_id
  where la.status = 'pending'
  group by
    la.id,
    la.user_id,
    la.role_requested,
    la.status,
    la.message,
    la.created_at,
    pr.full_name,
    pr.phone,
    pr.avatar_url
),
landlords as (
  select
    ur.user_id,
    array_agg(distinct ur.role) as roles,
    pr.full_name,
    pr.phone,
    pr.avatar_url
  from user_roles ur
  left join profiles pr on pr.user_id = ur.user_id
  where ur.role = 'landlord'
  group by ur.user_id, pr.full_name, pr.phone, pr.avatar_url
),
admins as (
  select ur.user_id
  from user_roles ur
  where ur.role = 'admin'
),
all_users as (
  select
    pr.user_id,
    pr.full_name,
    pr.phone,
    pr.avatar_url,
    pr.created_at as profile_created_at,
    array_agg(distinct ur.role) filter (where ur.role is not null) as roles
  from profiles pr
  left join user_roles ur on ur.user_id = pr.user_id
  group by pr.user_id, pr.full_name, pr.phone, pr.avatar_url, pr.created_at
),
application_status_counts as (
  select
    json_build_object(
      'pending', coalesce(sum(case when la.status = 'pending' then 1 else 0 end), 0),
      'approved', coalesce(sum(case when la.status = 'approved' then 1 else 0 end), 0),
      'rejected', coalesce(sum(case when la.status = 'rejected' then 1 else 0 end), 0)
    ) as counts
  from landlord_applications la
)
select
  (select coalesce(json_agg(p), '[]'::json) from (select * from pending_payments order by created_at desc) p) as pending_payments,
  (select coalesce(json_agg(a), '[]'::json) from (select * from pending_applications order by created_at desc) a) as pending_applications,
  (select coalesce(json_agg(l), '[]'::json) from landlords l) as landlords,
  (select coalesce(json_agg(a2), '[]'::json) from admins a2) as admins,
  (select coalesce(json_agg(u), '[]'::json) from (select * from all_users order by profile_created_at desc) u) as all_users,
  (select counts from application_status_counts) as application_status_counts;

-- Promote a user to admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('0be42ea4-06be-4b5a-aec4-c1cd2f45a23b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

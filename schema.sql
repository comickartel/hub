
-- 1. Admin roles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin'
    check (role in ('admin'))
);

-- 2. Fees by class, term, and year
create table public.fees (
  id bigint generated always as identity primary key,
  class_name text not null,
  term text not null check (term in ('Term 1', 'Term 2', 'Term 3')),
  academic_year integer not null,
  amount numeric(12,2) not null check (amount >= 0),
  updated_at timestamptz not null default now(),
  unique (class_name, term, academic_year)
);

-- 3. Students
create table public.students (
  id bigint generated always as identity primary key,
  admission_no text not null unique,
  full_name text not null,
  class_name text not null,
  created_at timestamptz not null default now()
);

-- 4. Payments
create table public.payments (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students(id),
  term text not null check (term in ('Term 1', 'Term 2', 'Term 3')),
  academic_year integer not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Enable row-level security
alter table public.profiles enable row level security;
alter table public.fees enable row level security;
alter table public.students enable row level security;
alter table public.payments enable row level security;

-- Check that the current signed-in user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins can manage their profile role only through trusted setup.
-- No client-side profile INSERT or UPDATE policy is provided.
create policy "Admins can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Admins can read fees"
on public.fees for select to authenticated
using (public.is_admin());

create policy "Admins can insert fees"
on public.fees for insert to authenticated
with check (public.is_admin());

create policy "Admins can update fees"
on public.fees for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete fees"
on public.fees for delete to authenticated
using (public.is_admin());

create policy "Admins can read students"
on public.students for select to authenticated
using (public.is_admin());

create policy "Admins can add students"
on public.students for insert to authenticated
with check (public.is_admin());

create policy "Admins can update students"
on public.students for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete students"
on public.students for delete to authenticated
using (public.is_admin());

create policy "Admins can read payments"
on public.payments for select to authenticated
using (public.is_admin());

create policy "Admins can record payments"
on public.payments for insert to authenticated
with check (public.is_admin());

create index students_class_idx
on public.students(class_name);

create index payments_student_term_year_idx
on public.payments(student_id, term, academic_year);

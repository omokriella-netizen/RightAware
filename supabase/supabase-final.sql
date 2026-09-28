create extension if not exists "pgcrypto";
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, email text, phone text, state text, language text default 'English',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('admin','editor','moderator','professional','user')),
  granted_at timestamptz default now(), primary key (user_id, role)
);
create table right_categories (
  id text primary key, title text not null, icon text, sort int default 0
);
create table rights (
  id text primary key, category_id text references right_categories(id),
  title text not null, summary text, body jsonb default '{}'::jsonb,
  status text default 'overview' check (status in ('full-guide','partial','overview')),
  featured boolean default false, keywords text default '',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table legal_documents (
  id text primary key, title text not null, category text not null,
  description text, source_hint text, year_note text,
  file_path text,
  related_rights text[] default '{}',
  verification_status text default 'awaiting-verification',
  verification_source text, verified_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table videos (
  id text primary key, title text not null, description text, category text,
  duration text, video_path text, thumb_path text, video_url text,
  featured boolean default false, related_rights text[] default '{}', lang text default 'English',
  status text default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table organizations (
  id text primary key, name text not null, logo_path text, description text,
  services text[] default '{}', specialization text, location text,
  address text, phone text, email text, website text,
  verification_status text default 'unverified' check (verification_status in ('unverified','pending','verified')),
  verification_source text, verified_at timestamptz, source_note text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table organization_contacts (
  id uuid primary key default gen_random_uuid(), org_id text references organizations(id) on delete cascade,
  label text, channel text, value text, state text, verified boolean default false
);
create table professionals (
  id text primary key, user_id uuid references auth.users(id),
  name text not null, photo_path text, qualification text,
  experience_yrs text, location text, languages text[] default '{}',
  bio text, consultation_options text[] default '{}', fee_note text, availability text,
  verification_status text default 'unverified' check (verification_status in ('unverified','pending','verified')),
  verification_source text, verified_at timestamptz, is_demo boolean default false,
  rating_avg numeric default 0, ratings_count int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table professional_specializations (
  professional_id text references professionals(id) on delete cascade,
  specialization text, primary key (professional_id, specialization)
);
create table professional_reviews (
  id uuid primary key default gen_random_uuid(), professional_id text references professionals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating int check (rating between 1 and 5), text text,
  verified_interaction boolean default false,
  status text default 'pending' check (status in ('pending','published','hidden')),
  reports int default 0, created_at timestamptz default now()
);
create table consultations (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
  professional_id text references professionals(id),
  message text, status text default 'requested', payment_reference text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table saved_items (
  user_id uuid references auth.users(id) on delete cascade,
  item_type text check (item_type in ('right','law','video','resource')),
  ref text, title text, created_at timestamptz default now(),
  primary key (user_id, item_type, ref)
);
create table faqs (
  id text primary key, question text not null, answer text not null,
  category text, sort int default 0, status text default 'published'
);
create table resources (
  id text primary key, title text not null, description text, kind text,
  url text, file_path text, status text default 'published'
);
create table contact_messages (
  id uuid primary key default gen_random_uuid(), name text, email text, topic text,
  message text, status text default 'new', created_at timestamptz default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  title text, body text, read boolean default false, created_at timestamptz default now()
);
create table payments (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id),
  professional_id text references professionals(id), service text,
  amount_kobo int, reference text unique, status text default 'pending'
  check (status in ('pending','successful','failed')), paid_at timestamptz,
  created_at timestamptz default now()
);
create table audit_logs (
  id bigint generated always as identity primary key, actor uuid references auth.users(id),
  action text, entity text, entity_id text, meta jsonb, created_at timestamptz default now()
);
create or replace function ra_is_admin() returns boolean language sql stable as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;
create or replace function ra_has_role(r text) returns boolean language sql stable as
$$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = r) $$;
create or replace function ra_touch_updated() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;
create trigger t_profiles before update on profiles for each row execute function ra_touch_updated();
create trigger t_rights before update on rights for each row execute function ra_touch_updated();
create trigger t_docs before update on legal_documents for each row execute function ra_touch_updated();
create trigger t_videos before update on videos for each row execute function ra_touch_updated();
create trigger t_orgs before update on organizations for each row execute function ra_touch_updated();
create trigger t_profs before update on professionals for each row execute function ra_touch_updated();
create trigger t_cons before update on consultations for each row execute function ra_touch_updated();
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table right_categories enable row level security;
alter table rights enable row level security;
alter table legal_documents enable row level security;
alter table videos enable row level security;
alter table organizations enable row level security;
alter table organization_contacts enable row level security;
alter table professionals enable row level security;
alter table professional_specializations enable row level security;
alter table professional_reviews enable row level security;
alter table consultations enable row level security;
alter table saved_items enable row level security;
alter table faqs enable row level security;
alter table resources enable row level security;
alter table contact_messages enable row level security;
alter table notifications enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
create policy pub_read_cats on right_categories for select using (true);
create policy pub_read_rights on rights for select using (true);
create policy pub_read_docs on legal_documents for select using (true);
create policy pub_read_videos on videos for select using (status='published');
create policy pub_read_orgs on organizations for select using (verification_status='verified');
create policy pub_read_contacts on organization_contacts for select using (verified=true);
create policy pub_read_profs on professionals for select using (verification_status='verified' and is_demo=false);
create policy pub_read_specs on professional_specializations for select using (true);
create policy pub_read_reviews on professional_reviews for select using (status='published');
create policy pub_read_faqs on faqs for select using (status='published');
create policy pub_read_resources on resources for select using (status='published');
create policy edit_content on rights for all using (ra_has_role('editor') or ra_is_admin());
create policy edit_docs on legal_documents for all using (ra_has_role('editor') or ra_is_admin());
create policy edit_videos on videos for all using (ra_has_role('editor') or ra_is_admin());
create policy edit_orgs on organizations for all using (ra_has_role('editor') or ra_is_admin());
create policy edit_faqs on faqs for all using (ra_has_role('editor') or ra_is_admin());
create policy edit_resources on resources for all using (ra_has_role('editor') or ra_is_admin());
create policy own_profile on profiles for all using (auth.uid()=id);
create policy own_saved on saved_items for all using (auth.uid()=user_id);
create policy own_cons on consultations for all using (auth.uid()=user_id);
create policy own_notif on notifications for all using (auth.uid()=user_id);
create policy anyone_contact on contact_messages for insert with check (true);
create policy admin_contact on contact_messages for select using (ra_is_admin());
create policy insert_review on professional_reviews for insert with check (auth.uid()=user_id);
create policy mod_review on professional_reviews for update using (ra_has_role('moderator') or ra_is_admin());
create policy own_pay on payments for select using (auth.uid()=user_id);
create policy admin_roles on user_roles for all using (ra_is_admin());
create policy admin_audit on audit_logs for select using (ra_is_admin());

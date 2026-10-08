begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.project_status as enum (
    'draft',
    'processing',
    'ready',
    'failed',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.scene_type as enum (
    'title',
    'definition',
    'bullet_points',
    'process',
    'example',
    'summary',
    'ai_video'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.render_type as enum (
    'remotion',
    'comfyui',
    'piper',
    'ffmpeg'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.render_status as enum (
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.project_status not null default 'draft',
  original_filename text,
  source_file_path text,
  duration_seconds integer,
  video_path text,
  audio_path text,
  final_video_path text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  extracted_text text,
  extraction_status text not null default 'pending',
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storyboards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1,
  title text,
  subject text,
  learning_objectives jsonb not null default '[]'::jsonb,
  raw_json jsonb not null default '{}'::jsonb,
  model_name text,
  generation_status text not null default 'pending',
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  storyboard_id uuid not null references public.storyboards(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_number integer not null,
  scene_type public.scene_type not null,
  title text,
  narration_text text,
  visual_description text,
  visual_prompt text,
  negative_prompt text,
  duration_seconds numeric(10,2) not null default 5,
  fps integer not null default 30,
  width integer not null default 1920,
  height integer not null default 1080,
  render_preference text not null default 'remotion',
  rendered_video_path text,
  rendered_audio_path text,
  status public.render_status not null default 'queued',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storyboard_id, scene_number),
  check (scene_number > 0),
  check (duration_seconds > 0),
  check (fps > 0),
  check (width > 0),
  check (height > 0)
);

create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  render_type public.render_type not null,
  status public.render_status not null default 'queued',
  external_job_id text,
  input_payload jsonb not null default '{}'::jsonb,
  output_path text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  duration_seconds numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx
on public.projects(user_id);

create index if not exists documents_project_id_idx
on public.documents(project_id);

create index if not exists storyboards_project_id_idx
on public.storyboards(project_id);

create index if not exists scenes_project_id_idx
on public.scenes(project_id);

create index if not exists scenes_storyboard_id_idx
on public.scenes(storyboard_id);

create index if not exists render_jobs_project_id_idx
on public.render_jobs(project_id);

create index if not exists assets_project_id_idx
on public.assets(project_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.storyboards enable row level security;
alter table public.scenes enable row level security;
alter table public.render_jobs enable row level security;
alter table public.assets enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists storyboards_set_updated_at on public.storyboards;
create trigger storyboards_set_updated_at
before update on public.storyboards
for each row execute function public.set_updated_at();

drop trigger if exists scenes_set_updated_at on public.scenes;
create trigger scenes_set_updated_at
before update on public.scenes
for each row execute function public.set_updated_at();

drop trigger if exists render_jobs_set_updated_at on public.render_jobs;
create trigger render_jobs_set_updated_at
before update on public.render_jobs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can view their own projects" on public.projects;
create policy "Users can view their own projects"
on public.projects
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
on public.projects
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
on public.projects
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
on public.projects
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view their own documents" on public.documents;
create policy "Users can view their own documents"
on public.documents
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own documents" on public.documents;
create policy "Users can create their own documents"
on public.documents
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own documents" on public.documents;
create policy "Users can update their own documents"
on public.documents
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own documents" on public.documents;
create policy "Users can delete their own documents"
on public.documents
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view their own storyboards" on public.storyboards;
create policy "Users can view their own storyboards"
on public.storyboards
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own storyboards" on public.storyboards;
create policy "Users can create their own storyboards"
on public.storyboards
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own storyboards" on public.storyboards;
create policy "Users can update their own storyboards"
on public.storyboards
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own storyboards" on public.storyboards;
create policy "Users can delete their own storyboards"
on public.storyboards
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view their own scenes" on public.scenes;
create policy "Users can view their own scenes"
on public.scenes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own scenes" on public.scenes;
create policy "Users can create their own scenes"
on public.scenes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own scenes" on public.scenes;
create policy "Users can update their own scenes"
on public.scenes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own scenes" on public.scenes;
create policy "Users can delete their own scenes"
on public.scenes
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can view their own render jobs" on public.render_jobs;
create policy "Users can view their own render jobs"
on public.render_jobs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own render jobs" on public.render_jobs;
create policy "Users can create their own render jobs"
on public.render_jobs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own render jobs" on public.render_jobs;
create policy "Users can update their own render_jobs"
on public.render_jobs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can view their own assets" on public.assets;
create policy "Users can view their own assets"
on public.assets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own assets" on public.assets;
create policy "Users can create their own assets"
on public.assets
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own assets" on public.assets;
create policy "Users can delete their own assets"
on public.assets
for delete
to authenticated
using (user_id = auth.uid());

commit;

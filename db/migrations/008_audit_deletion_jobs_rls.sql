begin;
create table if not exists public.audit_events (
 id uuid primary key, operation_id uuid not null, organization_id text not null, workspace_id text not null,
 assessment_id text not null, actor_user_id text not null,
 event_type text not null check(event_type in ('assessment.deletion.requested','assessment.deletion.completed','assessment.deletion.failed')),
 outcome text not null check(outcome in ('pending','success','failure')), detail_json jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists audit_events_scope_idx on public.audit_events(organization_id,workspace_id,assessment_id,created_at);
create table if not exists public.assessment_deletion_jobs (
 operation_id uuid primary key, organization_id text not null, workspace_id text not null, assessment_id text not null,
 actor_user_id text not null, status text not null check(status in ('queued','running','retry_scheduled','completed','exhausted')),
 storage_keys jsonb not null check(jsonb_typeof(storage_keys)='array'), deleted_storage_keys jsonb not null default '[]'::jsonb check(jsonb_typeof(deleted_storage_keys)='array'),
 attempt_count integer not null default 0 check(attempt_count>=0), max_attempts integer not null default 3 check(max_attempts between 1 and 10),
 next_attempt_at timestamptz, lease_expires_at timestamptz, last_error text check(last_error is null or length(last_error)<=500),
 receipt_json jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists assessment_deletion_jobs_active_assessment_idx on public.assessment_deletion_jobs(organization_id,workspace_id,assessment_id) where status in ('queued','running','retry_scheduled');
create index if not exists assessment_deletion_jobs_due_idx on public.assessment_deletion_jobs(organization_id,workspace_id,status,next_attempt_at,created_at);
alter table public.audit_events enable row level security; alter table public.audit_events force row level security;
alter table public.assessment_deletion_jobs enable row level security; alter table public.assessment_deletion_jobs force row level security;
create policy audit_events_admin_read on public.audit_events for select to authenticated using(app_supabase_has_membership(organization_id,workspace_id,array['admin']));
create policy audit_events_admin_insert on public.audit_events for insert to authenticated with check(actor_user_id=auth.uid()::text and app_supabase_has_membership(organization_id,workspace_id,array['admin']));
create policy deletion_jobs_admin_read on public.assessment_deletion_jobs for select to authenticated using(app_supabase_has_membership(organization_id,workspace_id,array['admin']));
create policy deletion_jobs_admin_insert on public.assessment_deletion_jobs for insert to authenticated with check(actor_user_id=auth.uid()::text and app_supabase_has_membership(organization_id,workspace_id,array['admin']));
create policy deletion_jobs_admin_update on public.assessment_deletion_jobs for update to authenticated using(actor_user_id=auth.uid()::text and app_supabase_has_membership(organization_id,workspace_id,array['admin'])) with check(actor_user_id=auth.uid()::text and app_supabase_has_membership(organization_id,workspace_id,array['admin']));
commit;

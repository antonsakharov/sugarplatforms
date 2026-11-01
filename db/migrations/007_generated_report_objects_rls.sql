-- Generated report object metadata; apply after 006_report_history_rls.sql.
create table if not exists public.generated_report_objects (
  organization_id text not null,
  workspace_id text not null,
  assessment_id text not null,
  report_id text not null,
  version integer not null check (version > 0),
  storage_key text not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  media_type text not null check (media_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0),
  page_count integer not null check (page_count > 0),
  created_at timestamptz not null default now(),
  primary key (organization_id, workspace_id, assessment_id, report_id),
  foreign key (organization_id, workspace_id, assessment_id, report_id)
    references public.report_snapshots(organization_id, workspace_id, assessment_id, report_id) on delete cascade
);
alter table public.generated_report_objects enable row level security;
alter table public.generated_report_objects force row level security;
create policy generated_report_objects_select on public.generated_report_objects for select using (
  exists (select 1 from public.workspace_memberships m where m.user_id=auth.uid() and m.organization_id=generated_report_objects.organization_id and m.workspace_id=generated_report_objects.workspace_id)
);
create policy generated_report_objects_insert on public.generated_report_objects for insert with check (
  exists (select 1 from public.workspace_memberships m where m.user_id=auth.uid() and m.organization_id=generated_report_objects.organization_id and m.workspace_id=generated_report_objects.workspace_id and m.role in ('editor','admin'))
);

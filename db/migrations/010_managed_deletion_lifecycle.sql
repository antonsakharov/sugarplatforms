begin;

-- Prepare a managed deletion atomically: authorize the admin, capture the complete
-- private-object plan, append the pending audit receipt, and create the durable job.
create or replace function public.app_prepare_assessment_deletion(
  p_organization_id text,
  p_workspace_id text,
  p_assessment_id text,
  p_actor_user_id text,
  p_max_attempts integer default 3
) returns public.assessment_deletion_jobs
language plpgsql security invoker set search_path=public as $$
declare
  j public.assessment_deletion_jobs;
  existing public.assessment_deletion_jobs;
  op uuid := gen_random_uuid();
  keys jsonb;
  artifact_count integer;
  report_count integer;
begin
  if p_actor_user_id <> auth.uid()::text or not app_supabase_has_membership(p_organization_id,p_workspace_id,array['admin']) then
    raise exception 'admin membership required';
  end if;
  if not exists(select 1 from public.assessments where organization_id=p_organization_id and workspace_id=p_workspace_id and id=p_assessment_id) then
    raise exception 'assessment not found' using errcode='P0002';
  end if;
  select * into existing from public.assessment_deletion_jobs
    where organization_id=p_organization_id and workspace_id=p_workspace_id and assessment_id=p_assessment_id
      and status in ('queued','running','retry_scheduled') order by created_at desc limit 1;
  if found then return existing; end if;

  select count(*) into artifact_count from public.artifact_metadata
    where organization_id=p_organization_id and workspace_id=p_workspace_id and assessment_id=p_assessment_id;
  select count(*) into report_count from public.generated_report_objects
    where organization_id=p_organization_id and workspace_id=p_workspace_id and assessment_id=p_assessment_id;
  select coalesce(jsonb_agg(storage_key order by storage_key),'[]'::jsonb) into keys from (
    select p_organization_id||'/'||p_workspace_id||'/'||p_assessment_id||'/'||storage_artifact_id as storage_key
      from public.artifact_metadata where organization_id=p_organization_id and workspace_id=p_workspace_id and assessment_id=p_assessment_id
    union
    select storage_key from public.generated_report_objects
      where organization_id=p_organization_id and workspace_id=p_workspace_id and assessment_id=p_assessment_id
  ) planned;

  insert into public.audit_events(id,operation_id,organization_id,workspace_id,assessment_id,actor_user_id,event_type,outcome,detail_json)
  values(gen_random_uuid(),op,p_organization_id,p_workspace_id,p_assessment_id,p_actor_user_id,'assessment.deletion.requested','pending',
    jsonb_build_object('artifactObjectCount',artifact_count,'generatedReportObjectCount',report_count,'privateObjectCount',jsonb_array_length(keys)));
  insert into public.assessment_deletion_jobs(operation_id,organization_id,workspace_id,assessment_id,actor_user_id,status,storage_keys,deleted_storage_keys,attempt_count,max_attempts,next_attempt_at)
  values(op,p_organization_id,p_workspace_id,p_assessment_id,p_actor_user_id,'queued',keys,'[]'::jsonb,0,greatest(1,least(coalesce(p_max_attempts,3),10)),now())
  returning * into j;
  return j;
end $$;

-- Finalization happens only after every planned private object has a durable deletion
-- checkpoint. Assessment cascades purge all relational diagnostic state in one transaction;
-- the minimal audit receipt and deletion job intentionally survive.
create or replace function public.app_finalize_assessment_deletion(
  p_organization_id text,
  p_workspace_id text,
  p_operation_id uuid,
  p_deleted_object_count integer
) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare
  j public.assessment_deletion_jobs;
  audit_id uuid := gen_random_uuid();
  completed_at timestamptz := now();
  receipt jsonb;
begin
  select * into j from public.assessment_deletion_jobs
    where operation_id=p_operation_id and organization_id=p_organization_id and workspace_id=p_workspace_id for update;
  if not found or j.status <> 'running' or j.actor_user_id <> auth.uid()::text or not app_supabase_has_membership(p_organization_id,p_workspace_id,array['admin']) then
    raise exception 'running deletion job unavailable';
  end if;
  if jsonb_array_length(j.deleted_storage_keys) <> jsonb_array_length(j.storage_keys) then
    raise exception 'private object deletion checkpoints incomplete';
  end if;
  if greatest(0,coalesce(p_deleted_object_count,0)) <> jsonb_array_length(j.deleted_storage_keys) then
    raise exception 'deleted object count mismatch';
  end if;

  delete from public.assessments
    where organization_id=p_organization_id and workspace_id=p_workspace_id and id=j.assessment_id;
  if not found then raise exception 'assessment not found' using errcode='P0002'; end if;

  receipt := jsonb_build_object(
    'operationId',j.operation_id::text,'assessmentId',j.assessment_id,
    'deletedArtifactObjects',jsonb_array_length(j.deleted_storage_keys),
    'deletedRows',jsonb_build_object('assessments',1),
    'completedAt',completed_at,'auditEventId',audit_id::text
  );
  insert into public.audit_events(id,operation_id,organization_id,workspace_id,assessment_id,actor_user_id,event_type,outcome,detail_json,created_at)
  values(audit_id,j.operation_id,p_organization_id,p_workspace_id,j.assessment_id,j.actor_user_id,'assessment.deletion.completed','success',
    jsonb_build_object('deletedArtifactObjects',jsonb_array_length(j.deleted_storage_keys),'deletedRows',jsonb_build_object('assessments',1)),completed_at);
  return receipt;
end $$;

commit;

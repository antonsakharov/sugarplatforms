begin;
-- Managed deletion job state transitions are exposed only through SECURITY INVOKER RPCs.
-- RLS remains active; every function repeats organization/workspace scope and requires admin membership.
create or replace function public.app_list_due_deletion_jobs(p_organization_id text,p_workspace_id text,p_now timestamptz,p_limit integer default 20)
returns setof public.assessment_deletion_jobs language sql security invoker set search_path=public as $$
 select * from public.assessment_deletion_jobs
 where organization_id=p_organization_id and workspace_id=p_workspace_id
 and app_supabase_has_membership(organization_id,workspace_id,array['admin'])
 and ((status in ('queued','retry_scheduled') and (next_attempt_at is null or next_attempt_at<=p_now)) or (status='running' and lease_expires_at is not null and lease_expires_at<=p_now))
 order by created_at asc limit greatest(1,least(coalesce(p_limit,20),20));
$$;
create or replace function public.app_start_deletion_attempt(p_organization_id text,p_workspace_id text,p_operation_id uuid)
returns public.assessment_deletion_jobs language plpgsql security invoker set search_path=public as $$ declare j public.assessment_deletion_jobs; begin
 select * into j from public.assessment_deletion_jobs where operation_id=p_operation_id and organization_id=p_organization_id and workspace_id=p_workspace_id for update;
 if not found or not app_supabase_has_membership(p_organization_id,p_workspace_id,array['admin']) then raise exception 'deletion job unavailable'; end if;
 if j.status in ('completed','exhausted') or j.attempt_count>=j.max_attempts then raise exception 'deletion job has no runnable attempt'; end if;
 if j.status='running' and j.lease_expires_at>now() then raise exception 'deletion job already running'; end if;
 update public.assessment_deletion_jobs set status='running',attempt_count=attempt_count+1,next_attempt_at=null,lease_expires_at=now()+interval '5 minutes',updated_at=now() where operation_id=p_operation_id returning * into j; return j; end $$;
create or replace function public.app_checkpoint_deleted_object(p_organization_id text,p_workspace_id text,p_operation_id uuid,p_storage_key text)
returns public.assessment_deletion_jobs language plpgsql security invoker set search_path=public as $$ declare j public.assessment_deletion_jobs; begin
 select * into j from public.assessment_deletion_jobs where operation_id=p_operation_id and organization_id=p_organization_id and workspace_id=p_workspace_id for update;
 if not found or j.status<>'running' or not app_supabase_has_membership(p_organization_id,p_workspace_id,array['admin']) then raise exception 'running deletion job unavailable'; end if;
 if not (j.storage_keys ? p_storage_key) then raise exception 'storage key outside deletion plan'; end if;
 if not (j.deleted_storage_keys ? p_storage_key) then update public.assessment_deletion_jobs set deleted_storage_keys=deleted_storage_keys||jsonb_build_array(p_storage_key),updated_at=now() where operation_id=p_operation_id returning * into j; end if; return j; end $$;
create or replace function public.app_record_deletion_failure(p_organization_id text,p_workspace_id text,p_operation_id uuid,p_error text)
returns public.assessment_deletion_jobs language plpgsql security invoker set search_path=public as $$ declare j public.assessment_deletion_jobs; exhausted boolean; delay_seconds integer; begin
 select * into j from public.assessment_deletion_jobs where operation_id=p_operation_id and organization_id=p_organization_id and workspace_id=p_workspace_id for update;
 if not found or not app_supabase_has_membership(p_organization_id,p_workspace_id,array['admin']) then raise exception 'deletion job unavailable'; end if;
 exhausted:=j.attempt_count>=j.max_attempts; delay_seconds:=least(900,30*(2^greatest(0,j.attempt_count-1))::integer);
 update public.assessment_deletion_jobs set status=case when exhausted then 'exhausted' else 'retry_scheduled' end,next_attempt_at=case when exhausted then null else now()+make_interval(secs=>delay_seconds) end,lease_expires_at=null,last_error=left(coalesce(p_error,'Deletion failed.'),500),updated_at=now() where operation_id=p_operation_id returning * into j; return j; end $$;
create or replace function public.app_complete_deletion_job(p_organization_id text,p_workspace_id text,p_operation_id uuid,p_receipt jsonb)
returns public.assessment_deletion_jobs language plpgsql security invoker set search_path=public as $$ declare j public.assessment_deletion_jobs; begin
 if not app_supabase_has_membership(p_organization_id,p_workspace_id,array['admin']) then raise exception 'admin membership required'; end if;
 update public.assessment_deletion_jobs set status='completed',next_attempt_at=null,lease_expires_at=null,last_error=null,receipt_json=p_receipt,updated_at=now() where operation_id=p_operation_id and organization_id=p_organization_id and workspace_id=p_workspace_id and status='running' returning * into j;
 if not found then raise exception 'running deletion job unavailable'; end if; return j; end $$;
commit;

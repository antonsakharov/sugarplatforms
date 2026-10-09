BEGIN;
CREATE TABLE IF NOT EXISTS report_snapshots (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  assessment_id text NOT NULL,
  report_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  diagnostic_generated_at timestamptz NOT NULL,
  snapshot_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id,assessment_id,report_id),
  UNIQUE (workspace_id,assessment_id,version),
  FOREIGN KEY (workspace_id,assessment_id) REFERENCES assessments(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS report_snapshots_scope_idx ON report_snapshots (organization_id,workspace_id,assessment_id,version);
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY report_snapshots_member_read ON report_snapshots FOR SELECT TO authenticated USING (app_supabase_has_membership(organization_id,workspace_id,NULL));
CREATE POLICY report_snapshots_editor_write ON report_snapshots FOR ALL TO authenticated USING (app_supabase_has_membership(organization_id,workspace_id,ARRAY['editor','admin'])) WITH CHECK (app_supabase_has_membership(organization_id,workspace_id,ARRAY['editor','admin']));

CREATE OR REPLACE FUNCTION save_report_snapshot(p_organization_id text,p_workspace_id text,p_assessment_id text,p_report jsonb,p_created_at timestamptz)
RETURNS report_snapshots LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current_finding finding_reviews%ROWTYPE; next_version integer; new_id text; result report_snapshots%ROWTYPE; snapshot jsonb;
BEGIN
  IF NOT app_supabase_has_membership(p_organization_id,p_workspace_id,ARRAY['editor','admin']) THEN RAISE EXCEPTION 'workspace membership denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO current_finding FROM finding_reviews WHERE organization_id=p_organization_id AND workspace_id=p_workspace_id AND assessment_id=p_assessment_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'completed finding review required' USING ERRCODE='P0002'; END IF;
  IF current_finding.review_json->>'reviewedAt' IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(current_finding.review_json->'findings') item WHERE item->>'status'='pending') THEN RAISE EXCEPTION 'completed finding review required' USING ERRCODE='23514'; END IF;
  IF p_report->>'assessmentId' <> p_assessment_id OR p_report->>'generatedFromDiagnosticAt' <> current_finding.diagnostics_json->>'generatedAt' THEN RAISE EXCEPTION 'stale report input' USING ERRCODE='40001'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id || ':' || p_assessment_id,0));
  SELECT COALESCE(MAX(version),0)+1 INTO next_version FROM report_snapshots WHERE organization_id=p_organization_id AND workspace_id=p_workspace_id AND assessment_id=p_assessment_id;
  new_id := 'report_' || p_assessment_id || '_v' || next_version;
  snapshot := jsonb_build_object('schemaVersion','1.0','id',new_id,'assessmentId',p_assessment_id,'version',next_version,'versionLabel','v' || next_version,'createdAt',p_created_at,'generatedFromDiagnosticAt',p_report->>'generatedFromDiagnosticAt','report',p_report);
  INSERT INTO report_snapshots(organization_id,workspace_id,assessment_id,report_id,version,diagnostic_generated_at,snapshot_json,created_at)
  VALUES(p_organization_id,p_workspace_id,p_assessment_id,new_id,next_version,(p_report->>'generatedFromDiagnosticAt')::timestamptz,snapshot,p_created_at) RETURNING * INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION save_report_snapshot(text,text,text,jsonb,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_report_snapshot(text,text,text,jsonb,timestamptz) TO authenticated;
COMMIT;

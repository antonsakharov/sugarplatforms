BEGIN;
CREATE TABLE IF NOT EXISTS finding_reviews (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  assessment_id text NOT NULL,
  diagnostic_fingerprint text NOT NULL CHECK (diagnostic_fingerprint ~ '^[0-9a-f]{64}$'),
  diagnostics_json jsonb NOT NULL,
  review_json jsonb NOT NULL,
  accepted_findings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id,assessment_id),
  FOREIGN KEY (workspace_id,assessment_id) REFERENCES assessments(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS finding_reviews_scope_idx ON finding_reviews (organization_id,workspace_id,assessment_id,updated_at);
ALTER TABLE finding_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY finding_reviews_member_read ON finding_reviews FOR SELECT TO authenticated USING (app_supabase_has_membership(organization_id,workspace_id,NULL));
CREATE POLICY finding_reviews_editor_write ON finding_reviews FOR ALL TO authenticated USING (app_supabase_has_membership(organization_id,workspace_id,ARRAY['editor','admin'])) WITH CHECK (app_supabase_has_membership(organization_id,workspace_id,ARRAY['editor','admin']));
CREATE OR REPLACE FUNCTION save_finding_review(p_organization_id text,p_workspace_id text,p_assessment_id text,p_expected_extraction_review jsonb,p_diagnostic_fingerprint text,p_diagnostics jsonb,p_review jsonb,p_accepted_findings jsonb,p_updated_at timestamptz) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current_review jsonb;
BEGIN
  IF NOT app_supabase_has_membership(p_organization_id,p_workspace_id,ARRAY['editor','admin']) THEN RAISE EXCEPTION 'workspace membership denied' USING ERRCODE='42501'; END IF;
  SELECT review_json INTO current_review FROM extraction_reviews WHERE organization_id=p_organization_id AND workspace_id=p_workspace_id AND assessment_id=p_assessment_id;
  IF current_review IS NULL THEN RAISE EXCEPTION 'extraction review not found' USING ERRCODE='P0002'; END IF;
  IF current_review <> p_expected_extraction_review THEN RAISE EXCEPTION 'stale extraction review' USING ERRCODE='40001'; END IF;
  IF COALESCE((current_review->>'approved')::boolean,false) IS NOT TRUE OR current_review->>'approvedAt' IS NULL THEN RAISE EXCEPTION 'approved extraction required' USING ERRCODE='23514'; END IF;
  IF p_diagnostics->>'assessmentId' <> p_assessment_id OR p_review->>'assessmentId' <> p_assessment_id THEN RAISE EXCEPTION 'assessment scope mismatch' USING ERRCODE='23514'; END IF;
  IF p_diagnostics->>'extractionApprovedAt' <> current_review->>'approvedAt' THEN RAISE EXCEPTION 'stale finding review' USING ERRCODE='40001'; END IF;
  INSERT INTO finding_reviews (organization_id,workspace_id,assessment_id,diagnostic_fingerprint,diagnostics_json,review_json,accepted_findings_json,updated_at) VALUES (p_organization_id,p_workspace_id,p_assessment_id,p_diagnostic_fingerprint,p_diagnostics,p_review,p_accepted_findings,p_updated_at)
  ON CONFLICT (workspace_id,assessment_id) DO UPDATE SET organization_id=EXCLUDED.organization_id,diagnostic_fingerprint=EXCLUDED.diagnostic_fingerprint,diagnostics_json=EXCLUDED.diagnostics_json,review_json=EXCLUDED.review_json,accepted_findings_json=EXCLUDED.accepted_findings_json,updated_at=EXCLUDED.updated_at;
END; $$;
REVOKE ALL ON FUNCTION save_finding_review(text,text,text,jsonb,text,jsonb,jsonb,jsonb,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_finding_review(text,text,text,jsonb,text,jsonb,jsonb,jsonb,timestamptz) TO authenticated;
COMMIT;

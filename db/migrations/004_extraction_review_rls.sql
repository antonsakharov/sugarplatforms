BEGIN;
CREATE TABLE IF NOT EXISTS extraction_reviews (organization_id text NOT NULL,workspace_id text NOT NULL,assessment_id text NOT NULL,extraction_fingerprint text NOT NULL CHECK (extraction_fingerprint ~ '^[0-9a-f]{64}$'),review_json jsonb NOT NULL,updated_at timestamptz NOT NULL,PRIMARY KEY (workspace_id,assessment_id),FOREIGN KEY (workspace_id,assessment_id) REFERENCES assessments(workspace_id,id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS extraction_reviews_scope_idx ON extraction_reviews (organization_id,workspace_id,assessment_id,updated_at);
ALTER TABLE extraction_reviews ENABLE ROW LEVEL SECURITY; ALTER TABLE extraction_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY extraction_reviews_member_read ON extraction_reviews FOR SELECT TO authenticated USING (app_supabase_has_membership(organization_id,workspace_id,NULL));
CREATE POLICY extraction_reviews_editor_write ON extraction_reviews FOR ALL TO authenticated USING (app_supabase_has_membership(organization_id,workspace_id,ARRAY['editor','admin'])) WITH CHECK (app_supabase_has_membership(organization_id,workspace_id,ARRAY['editor','admin']));
CREATE OR REPLACE FUNCTION save_extraction_review(p_organization_id text,p_workspace_id text,p_assessment_id text,p_expected_extraction jsonb,p_extraction_fingerprint text,p_review jsonb,p_updated_at timestamptz) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE current_extraction jsonb;
BEGIN
IF NOT app_supabase_has_membership(p_organization_id,p_workspace_id,ARRAY['editor','admin']) THEN RAISE EXCEPTION 'workspace membership denied' USING ERRCODE='42501'; END IF;
SELECT payload_json INTO current_extraction FROM extraction_snapshots WHERE organization_id=p_organization_id AND workspace_id=p_workspace_id AND assessment_id=p_assessment_id;
IF current_extraction IS NULL THEN RAISE EXCEPTION 'extraction snapshot not found' USING ERRCODE='P0002'; END IF;
IF current_extraction <> p_expected_extraction THEN RAISE EXCEPTION 'stale extraction review' USING ERRCODE='40001'; END IF;
INSERT INTO extraction_reviews (organization_id,workspace_id,assessment_id,extraction_fingerprint,review_json,updated_at) VALUES (p_organization_id,p_workspace_id,p_assessment_id,p_extraction_fingerprint,p_review,p_updated_at) ON CONFLICT (workspace_id,assessment_id) DO UPDATE SET organization_id=EXCLUDED.organization_id,extraction_fingerprint=EXCLUDED.extraction_fingerprint,review_json=EXCLUDED.review_json,updated_at=EXCLUDED.updated_at;
END; $$;
REVOKE ALL ON FUNCTION save_extraction_review(text,text,text,jsonb,text,jsonb,timestamptz) FROM PUBLIC; GRANT EXECUTE ON FUNCTION save_extraction_review(text,text,text,jsonb,text,jsonb,timestamptz) TO authenticated;
COMMIT;

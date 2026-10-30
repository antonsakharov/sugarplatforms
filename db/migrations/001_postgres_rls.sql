BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (organization_id, id)
);
CREATE TABLE IF NOT EXISTS app_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (organization_id, workspace_id) REFERENCES workspaces(organization_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS memberships_scope_idx ON memberships (organization_id, workspace_id, user_id);
CREATE TABLE IF NOT EXISTS assessments (
  organization_id text NOT NULL,
  workspace_id text NOT NULL,
  id text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft')),
  created_at timestamptz NOT NULL,
  payload_json jsonb NOT NULL,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (organization_id, workspace_id) REFERENCES workspaces(organization_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS assessments_workspace_status_idx ON assessments (organization_id, workspace_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS assessments_one_active_per_workspace_idx ON assessments (workspace_id) WHERE status = 'draft';

CREATE OR REPLACE FUNCTION app_setting(name text) RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting(name, true), '');
$$;
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT app_setting('app.user_id'); $$;
CREATE OR REPLACE FUNCTION app_current_organization_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT app_setting('app.organization_id'); $$;
CREATE OR REPLACE FUNCTION app_current_workspace_id() RETURNS text LANGUAGE sql STABLE AS $$ SELECT app_setting('app.workspace_id'); $$;
CREATE OR REPLACE FUNCTION app_has_workspace_membership(required_roles text[] DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = app_current_user_id()
      AND m.organization_id = app_current_organization_id()
      AND m.workspace_id = app_current_workspace_id()
      AND (required_roles IS NULL OR m.role = ANY(required_roles))
  );
$$;
REVOKE ALL ON FUNCTION app_has_workspace_membership(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_has_workspace_membership(text[]) TO PUBLIC;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE app_users FORCE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE assessments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_member_read ON organizations;
CREATE POLICY organizations_member_read ON organizations FOR SELECT USING (id = app_current_organization_id() AND app_has_workspace_membership(NULL));
DROP POLICY IF EXISTS workspaces_member_read ON workspaces;
CREATE POLICY workspaces_member_read ON workspaces FOR SELECT USING (organization_id = app_current_organization_id() AND id = app_current_workspace_id() AND app_has_workspace_membership(NULL));
DROP POLICY IF EXISTS app_users_self_read ON app_users;
CREATE POLICY app_users_self_read ON app_users FOR SELECT USING (id = app_current_user_id() AND app_has_workspace_membership(NULL));
DROP POLICY IF EXISTS memberships_self_read ON memberships;
CREATE POLICY memberships_self_read ON memberships FOR SELECT USING (user_id = app_current_user_id() AND organization_id = app_current_organization_id() AND workspace_id = app_current_workspace_id());
DROP POLICY IF EXISTS assessments_member_read ON assessments;
CREATE POLICY assessments_member_read ON assessments FOR SELECT USING (organization_id = app_current_organization_id() AND workspace_id = app_current_workspace_id() AND app_has_workspace_membership(NULL));
DROP POLICY IF EXISTS assessments_editor_insert ON assessments;
CREATE POLICY assessments_editor_insert ON assessments FOR INSERT WITH CHECK (organization_id = app_current_organization_id() AND workspace_id = app_current_workspace_id() AND app_has_workspace_membership(ARRAY['editor','admin']));

COMMIT;

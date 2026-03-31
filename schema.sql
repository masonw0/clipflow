-- ClipFlow Database Schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'editor', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────
-- WORKSPACES
-- ─────────────────────────────────────────────
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- WORKSPACE MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- ─────────────────────────────────────────────
-- SESSIONS  (review sessions / projects)
-- ─────────────────────────────────────────────
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'approved', 'archived')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  brief JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CLIPS
-- ─────────────────────────────────────────────
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  version INTEGER NOT NULL DEFAULT 1,
  parent_clip_id UUID REFERENCES clips(id),  -- for versioning
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ACTIVITY  (comments, status changes, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('comment', 'status_change', 'upload', 'approval', 'rejection', 'revision_request', 'member_added', 'member_removed')),
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AGREEMENTS  (contract / NDA templates)
-- ─────────────────────────────────────────────
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SIGNATURES  (agreement sign-offs)
-- ─────────────────────────────────────────────
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES profiles(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE (agreement_id, signer_id)
);

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at      BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_workspaces_updated_at    BEFORE UPDATE ON workspaces    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_sessions_updated_at      BEFORE UPDATE ON sessions      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_clips_updated_at         BEFORE UPDATE ON clips         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_agreements_updated_at    BEFORE UPDATE ON agreements    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures          ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read any profile, only update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Workspaces: members can read, owners can insert/update/delete
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = id AND user_id = auth.uid()));
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (auth.uid() = owner_id);

-- Workspace members
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "workspace_members_insert" ON workspace_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
           OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('owner','admin')));
CREATE POLICY "workspace_members_delete" ON workspace_members FOR DELETE
  USING (user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid()));

-- Sessions: workspace members can read; editors/admins/owners can write
CREATE POLICY "sessions_select" ON sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sessions.workspace_id AND user_id = auth.uid()));
CREATE POLICY "sessions_insert" ON sessions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sessions.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin','editor')));
CREATE POLICY "sessions_update" ON sessions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sessions.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin','editor')));
CREATE POLICY "sessions_delete" ON sessions FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sessions.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin')));

-- Clips: all workspace members can read and insert; owners/admins/editors can update/delete
CREATE POLICY "clips_select" ON clips FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clips.workspace_id AND user_id = auth.uid()));
CREATE POLICY "clips_insert" ON clips FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clips.workspace_id AND user_id = auth.uid()));
CREATE POLICY "clips_update" ON clips FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clips.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin','editor')));
CREATE POLICY "clips_delete" ON clips FOR DELETE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clips.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin')));

-- Activity: workspace members can read; any member can insert
CREATE POLICY "activity_select" ON activity FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity.workspace_id AND user_id = auth.uid()));
CREATE POLICY "activity_insert" ON activity FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity.workspace_id AND user_id = auth.uid()));

-- Agreements: workspace members can read; admins/owners can write
CREATE POLICY "agreements_select" ON agreements FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = agreements.workspace_id AND user_id = auth.uid()));
CREATE POLICY "agreements_insert" ON agreements FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = agreements.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin')));
CREATE POLICY "agreements_update" ON agreements FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = agreements.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin')));

-- Signatures: signers can read their own; any workspace member can sign
CREATE POLICY "signatures_select" ON signatures FOR SELECT
  USING (signer_id = auth.uid()
      OR EXISTS (SELECT 1 FROM workspaces WHERE id = signatures.workspace_id AND owner_id = auth.uid()));
CREATE POLICY "signatures_insert" ON signatures FOR INSERT
  WITH CHECK (auth.uid() = signer_id AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = signatures.workspace_id AND user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- CLIP COMMENTS  (timestamped creator notes)
-- ─────────────────────────────────────────────
CREATE TABLE clip_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  timestamp_seconds INTEGER,
  timestamp_label TEXT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clip_comments ENABLE ROW LEVEL SECURITY;

-- All workspace members can read comments
CREATE POLICY "clip_comments_select" ON clip_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clip_comments.workspace_id AND user_id = auth.uid()));

-- Workspace members with creator roles can insert
CREATE POLICY "clip_comments_insert" ON clip_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clip_comments.workspace_id AND user_id = auth.uid() AND role IN ('owner','admin','editor'))
  );

-- Users can delete their own comments
CREATE POLICY "clip_comments_delete" ON clip_comments FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- STORAGE BUCKET + POLICIES  (run once)
-- ─────────────────────────────────────────────

-- 1. Create the clips bucket (public so URLs work without signed tokens)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clips', 'clips', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow any authenticated workspace member to upload to the clips bucket
CREATE POLICY "clips_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'clips'
    AND auth.role() = 'authenticated'
  );

-- 3. Allow public read of all objects in the clips bucket
CREATE POLICY "clips_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'clips');

-- 4. Allow uploader to delete their own objects
CREATE POLICY "clips_storage_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'clips'
    AND auth.uid() = owner
  );

-- Also fix the clips table INSERT policy to allow clippers (any workspace member can insert)
-- Drop old restrictive policy and replace with the open one if needed:
-- DROP POLICY IF EXISTS "clips_insert" ON clips;
-- CREATE POLICY "clips_insert" ON clips FOR INSERT
--   WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = clips.workspace_id AND user_id = auth.uid()));

-- Fix activity INSERT policy — current schema requires user_id column on activity which may not exist
-- Replace with workspace-member-only check:
-- DROP POLICY IF EXISTS "activity_insert" ON activity;
-- CREATE POLICY "activity_insert" ON activity FOR INSERT
--   WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity.workspace_id AND user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- MIGRATION: Add brief column to sessions
-- Run this if the sessions table already exists:
-- ─────────────────────────────────────────────
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS brief JSONB DEFAULT '{}';

-- ─────────────────────────────────────────────
-- MIGRATION: Add manager role support
-- Run this to allow 'manager' and 'clipper' in workspace_members.role
-- ─────────────────────────────────────────────

-- 1. Drop existing role CHECK constraints and add 'manager' + 'clipper' to both tables

-- workspace_members role constraint
ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'clipper', 'manager'));

-- profiles role constraint (add 'clipper' and 'manager' so invite-based signups work)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('creator', 'editor', 'admin', 'clipper', 'manager'));

-- 2. Managers can read sessions (same as workspace members)
-- (existing sessions_select policy covers all workspace members, no change needed)

-- 3. Managers can insert/update sessions (same as editors)
DROP POLICY IF EXISTS "sessions_insert" ON sessions;
CREATE POLICY "sessions_insert" ON sessions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = sessions.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin','editor','manager')
  ));

DROP POLICY IF EXISTS "sessions_update" ON sessions;
CREATE POLICY "sessions_update" ON sessions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = sessions.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin','editor','manager')
  ));

-- 4. Managers can update clips (approve/reject/revision)
DROP POLICY IF EXISTS "clips_update" ON clips;
CREATE POLICY "clips_update" ON clips FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = clips.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin','editor','manager')
  ));

-- 5. Managers can delete clips
DROP POLICY IF EXISTS "clips_delete" ON clips;
CREATE POLICY "clips_delete" ON clips FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = clips.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  ));

-- 6. Managers can read and write agreements
DROP POLICY IF EXISTS "agreements_insert" ON agreements;
CREATE POLICY "agreements_insert" ON agreements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = agreements.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  ));

DROP POLICY IF EXISTS "agreements_update" ON agreements;
CREATE POLICY "agreements_update" ON agreements FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = agreements.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin','manager')
  ));

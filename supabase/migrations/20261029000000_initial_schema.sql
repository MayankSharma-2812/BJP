-- Last Mile - Initial Database Schema Migration
-- Workstream B: Data Foundation & Authorization (Shyam)
-- References: docs/05_BACKEND_SCHEMA.md, docs/07_SECURITY_THREAT_MODEL.md

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT CHECK (char_length(display_name) <= 100),
    locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es', 'fr', 'de', 'hi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. VAULTS TABLE
-- ============================================================================
-- No plaintext assets, passphrases, raw DEKs, or shares may be stored in this table.
CREATE TABLE IF NOT EXISTS public.vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (
        status IN (
            'ACTIVE',
            'CHECKIN_DUE',
            'GRACE_PERIOD',
            'RECOVERY_PENDING',
            'RECOVERY_COOLING_OFF',
            'RECOVERY_READY',
            'RECOVERED',
            'CANCELLED',
            'ARCHIVED'
        )
    ),
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    crypto_version INT NOT NULL DEFAULT 1 CHECK (crypto_version > 0),
    -- Base64url encoded AES-256-GCM ciphertext of encrypted asset inventory
    payload_ciphertext TEXT NOT NULL CHECK (char_length(payload_ciphertext) <= 1048576), -- 1MB payload limit
    -- Base64url encoded 12-byte nonce
    payload_nonce TEXT NOT NULL CHECK (char_length(payload_nonce) BETWEEN 16 AND 24),
    payload_aad_version INT NOT NULL DEFAULT 1 CHECK (payload_aad_version > 0),
    -- Base64url encoded wrapped DEK
    wrapped_dek TEXT NOT NULL CHECK (char_length(wrapped_dek) <= 4096),
    -- Base64url encoded 12-byte nonce for key wrapping
    wrap_nonce TEXT NOT NULL CHECK (char_length(wrap_nonce) BETWEEN 16 AND 24),
    kdf_name TEXT NOT NULL DEFAULT 'scrypt' CHECK (kdf_name = 'scrypt'),
    kdf_params JSONB NOT NULL,
    -- Base64url encoded salt
    kdf_salt TEXT NOT NULL CHECK (char_length(kdf_salt) BETWEEN 16 AND 128),
    checkin_interval_seconds INT NOT NULL CHECK (checkin_interval_seconds >= 60),
    last_checkin_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    next_checkin_at TIMESTAMPTZ NOT NULL,
    grace_ends_at TIMESTAMPTZ,
    cooling_off_ends_at TIMESTAMPTZ,
    unlock_expires_at TIMESTAMPTZ,
    revision BIGINT NOT NULL DEFAULT 1 CHECK (revision >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Security guard: Nonce reuse prevention
    CONSTRAINT check_distinct_nonces CHECK (wrap_nonce <> payload_nonce)
);

CREATE INDEX IF NOT EXISTS idx_vaults_owner_id ON public.vaults(owner_id);
CREATE INDEX IF NOT EXISTS idx_vaults_status ON public.vaults(status);

-- ============================================================================
-- 3. NOMINEES TABLE
-- ============================================================================
-- Never store recovery share bytes or share checksums here.
CREATE TABLE IF NOT EXISTS public.nominees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    email TEXT NOT NULL CHECK (char_length(email) <= 255 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    display_name TEXT NOT NULL CHECK (char_length(display_name) <= 100),
    share_index SMALLINT NOT NULL CHECK (share_index IN (1, 2, 3)),
    invite_token_hash TEXT CHECK (char_length(invite_token_hash) <= 128),
    invite_expires_at TIMESTAMPTZ,
    invite_accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_nominees_vault_share_index UNIQUE (vault_id, share_index)
);

CREATE INDEX IF NOT EXISTS idx_nominees_vault_status ON public.nominees(vault_id, status);
CREATE INDEX IF NOT EXISTS idx_nominees_user_id ON public.nominees(user_id);
CREATE INDEX IF NOT EXISTS idx_nominees_invite_token_hash ON public.nominees(invite_token_hash);

-- ============================================================================
-- 4. RECOVERY REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'cooling_off', 'ready', 'cancelled', 'expired')
    ),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    cooling_off_ends_at TIMESTAMPTZ,
    unlock_expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(user_id),
    revision BIGINT NOT NULL DEFAULT 1 CHECK (revision >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recovery_requests_vault_status ON public.recovery_requests(vault_id, status);

-- Partial unique index: only one active recovery request per vault
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_recovery_request 
    ON public.recovery_requests(vault_id) 
    WHERE status IN ('pending', 'cooling_off', 'ready');

-- ============================================================================
-- 5. RECOVERY APPROVALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recovery_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recovery_request_id UUID NOT NULL REFERENCES public.recovery_requests(id) ON DELETE CASCADE,
    nominee_id UUID NOT NULL REFERENCES public.nominees(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approve', 'decline')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    request_id UUID,
    CONSTRAINT uq_recovery_approvals_request_nominee UNIQUE (recovery_request_id, nominee_id)
);

CREATE INDEX IF NOT EXISTS idx_recovery_approvals_request ON public.recovery_approvals(recovery_request_id);

-- ============================================================================
-- 6. AUDIT EVENTS TABLE (Hash-Chained)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    sequence BIGINT NOT NULL CHECK (sequence >= 1),
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'vault_created',
            'payload_updated',
            'checkin_recorded',
            'state_transitioned',
            'nominee_added',
            'nominee_updated',
            'nominee_revoked',
            'invite_sent',
            'invite_accepted',
            'recovery_started',
            'nominee_approved',
            'nominee_declined',
            'recovery_cooling_off',
            'recovery_ready',
            'recovery_cancelled',
            'recovery_expired',
            'client_reported_recovery_complete'
        )
    ),
    actor_user_id UUID REFERENCES public.profiles(user_id),
    server_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    event_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL,
    request_id UUID,
    CONSTRAINT uq_audit_events_vault_sequence UNIQUE (vault_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_vault_seq ON public.audit_events(vault_id, sequence ASC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ============================================================================

-- Enable RLS on all exposed tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from anon role by default (fail-closed)
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.vaults FROM anon;
REVOKE ALL ON public.nominees FROM anon;
REVOKE ALL ON public.recovery_requests FROM anon;
REVOKE ALL ON public.recovery_approvals FROM anon;
REVOKE ALL ON public.audit_events FROM anon;

-- Grant permissions to authenticated and service_role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vaults TO authenticated;
GRANT ALL ON public.vaults TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nominees TO authenticated;
GRANT ALL ON public.nominees TO service_role;

GRANT SELECT ON public.recovery_requests TO authenticated;
GRANT ALL ON public.recovery_requests TO service_role;

GRANT SELECT, INSERT ON public.recovery_approvals TO authenticated;
GRANT ALL ON public.recovery_approvals TO service_role;

GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;

-- ----------------------------------------------------------------------------
-- RLS Policies: profiles
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- RLS Policies: vaults
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners can view own vaults" 
    ON public.vaults FOR SELECT 
    TO authenticated 
    USING (
        auth.uid() = owner_id 
        OR id IN (
            SELECT n.vault_id FROM public.nominees n 
            WHERE n.user_id = auth.uid() AND n.status = 'active'
        )
    );

CREATE POLICY "Owners can insert own vaults" 
    ON public.vaults FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own vaults" 
    ON public.vaults FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- RLS Policies: nominees
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners and assigned nominees can view nominees" 
    ON public.nominees FOR SELECT 
    TO authenticated 
    USING (
        vault_id IN (SELECT v.id FROM public.vaults v WHERE v.owner_id = auth.uid())
        OR user_id = auth.uid()
    );

CREATE POLICY "Owners can insert nominees for own vaults" 
    ON public.nominees FOR INSERT 
    TO authenticated 
    WITH CHECK (
        vault_id IN (SELECT v.id FROM public.vaults v WHERE v.owner_id = auth.uid())
    );

CREATE POLICY "Owners and invited nominees can update nominees" 
    ON public.nominees FOR UPDATE 
    TO authenticated 
    USING (
        vault_id IN (SELECT v.id FROM public.vaults v WHERE v.owner_id = auth.uid())
        OR (user_id IS NULL OR user_id = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- RLS Policies: recovery_requests
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners and eligible nominees can view recovery requests" 
    ON public.recovery_requests FOR SELECT 
    TO authenticated 
    USING (
        vault_id IN (SELECT v.id FROM public.vaults v WHERE v.owner_id = auth.uid())
        OR vault_id IN (
            SELECT n.vault_id FROM public.nominees n 
            WHERE n.user_id = auth.uid() AND n.status = 'active'
        )
    );

-- ----------------------------------------------------------------------------
-- RLS Policies: recovery_approvals
-- ----------------------------------------------------------------------------
CREATE POLICY "Nominees and owners can view recovery approvals" 
    ON public.recovery_approvals FOR SELECT 
    TO authenticated 
    USING (
        nominee_id IN (SELECT n.id FROM public.nominees n WHERE n.user_id = auth.uid())
        OR recovery_request_id IN (
            SELECT rr.id FROM public.recovery_requests rr
            JOIN public.vaults v ON v.id = rr.vault_id
            WHERE v.owner_id = auth.uid()
        )
    );

CREATE POLICY "Active nominees can insert recovery approvals" 
    ON public.recovery_approvals FOR INSERT 
    TO authenticated 
    WITH CHECK (
        nominee_id IN (
            SELECT n.id FROM public.nominees n 
            WHERE n.user_id = auth.uid() AND n.status = 'active'
        )
    );

-- ----------------------------------------------------------------------------
-- RLS Policies: audit_events
-- ----------------------------------------------------------------------------
CREATE POLICY "Owners and active nominees can view audit events" 
    ON public.audit_events FOR SELECT 
    TO authenticated 
    USING (
        vault_id IN (SELECT v.id FROM public.vaults v WHERE v.owner_id = auth.uid())
        OR vault_id IN (
            SELECT n.vault_id FROM public.nominees n 
            WHERE n.user_id = auth.uid() AND n.status = 'active'
        )
    );

-- ----------------------------------------------------------------------------
-- Automatic timestamp update function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_vaults_updated
    BEFORE UPDATE ON public.vaults
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_nominees_updated
    BEFORE UPDATE ON public.nominees
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Keep the redirect path at two client/database round trips while making the
-- dedup decision and insert serial for one (link, visitor/fingerprint) key.
-- A PL/pgSQL function is used because each statement it runs under READ
-- COMMITTED receives a fresh snapshot after an advisory-lock wait.
CREATE OR REPLACE FUNCTION insert_deduplicated_click(
    p_id TEXT,
    p_tracking_link_id UUID,
    p_brand_id UUID,
    p_visitor_id UUID,
    p_fp_hash TEXT,
    p_occurred_at TIMESTAMPTZ,
    p_signal_kind TEXT,
    p_signal_value TEXT,
    p_since TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    v_creditable BOOLEAN;
BEGIN
    IF p_signal_kind NOT IN ('visitor', 'fingerprint') THEN
        RAISE EXCEPTION 'unknown click dedup signal kind: %', p_signal_kind;
    END IF;

    -- A 64-bit hash collision only serializes unrelated clicks; it cannot
    -- change their dedup predicates or attribution result.
    PERFORM pg_advisory_xact_lock(
        hashtextextended(
            p_tracking_link_id::TEXT || chr(31) || p_signal_kind || chr(31) || p_signal_value,
            0
        )
    );

    IF p_signal_kind = 'visitor' THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM click prior
            WHERE prior.tracking_link_id = p_tracking_link_id
              AND prior.visitor_id = p_signal_value::UUID
              -- Exactly 30m is outside the window and remains creditable.
              AND prior.occurred_at > p_since
              AND prior.occurred_at <= p_occurred_at
        ) INTO v_creditable;
    ELSE
        SELECT NOT EXISTS (
            SELECT 1
            FROM click prior
            WHERE prior.tracking_link_id = p_tracking_link_id
              AND prior.fp_hash = p_signal_value
              AND prior.occurred_at > p_since
              AND prior.occurred_at <= p_occurred_at
        ) INTO v_creditable;
    END IF;

    INSERT INTO click (
        id,
        tracking_link_id,
        brand_id,
        visitor_id,
        fp_hash,
        occurred_at,
        creditable
    ) VALUES (
        p_id,
        p_tracking_link_id,
        p_brand_id,
        p_visitor_id,
        p_fp_hash,
        p_occurred_at,
        v_creditable
    );

    RETURN v_creditable;
END;
$$;

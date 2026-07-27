-- ============================================================
-- Translate task mention & assignment notification strings to German
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_task_mentions(
  p_company_id    UUID,
  p_task_id       UUID,
  p_task_title    TEXT,
  p_task_text     TEXT,      -- combined title + description to scan for @mentions
  p_sender_name   TEXT,
  p_assigned_to   UUID DEFAULT NULL   -- employee id from tasks.assigned_to
)
RETURNS INTEGER              -- number of notifications created
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count       INTEGER := 0;
  v_mention     TEXT;
  v_user_id     UUID;
  v_full_name   TEXT;
  v_already     UUID[];      -- deduplicate: only one notification per user per call
BEGIN
  v_already := ARRAY[]::UUID[];

  -- ── 1. Assigned-to notification ──────────────────────────────────────────
  IF p_assigned_to IS NOT NULL THEN
    SELECT user_id, full_name
      INTO v_user_id, v_full_name
      FROM public.employees
     WHERE id = p_assigned_to
       AND company_id = p_company_id
     LIMIT 1;

    IF v_user_id IS NOT NULL AND NOT (v_user_id = ANY(v_already)) THEN
      INSERT INTO public.notifications
        (user_id, company_id, title, message, type, category, is_read, related_id, related_table)
      VALUES
        (v_user_id, p_company_id,
         'Neue Aufgabe zugewiesen',
         p_sender_name || ' hat Ihnen eine Aufgabe zugewiesen: "' || p_task_title || '"',
         'info', 'task', false, p_task_id, 'tasks');
      v_count  := v_count + 1;
      v_already := v_already || v_user_id;
    END IF;
  END IF;

  -- ── 2. @mention notifications ─────────────────────────────────────────────
  -- Extract every "@word word" pattern (case-insensitive, exactly two words)
  FOR v_mention IN
    SELECT lower(trim(m[1]))
      FROM regexp_matches(p_task_text, '@([A-Za-z]+\s+[A-Za-z0-9]+)', 'g') AS m
  LOOP
    v_user_id   := NULL;
    v_full_name := NULL;

    -- Try employees table first (full_name exact match)
    SELECT user_id, full_name
      INTO v_user_id, v_full_name
      FROM public.employees
     WHERE company_id = p_company_id
       AND lower(trim(full_name)) = v_mention
       AND user_id IS NOT NULL
     LIMIT 1;

    -- Fallback: team_members exact first+last match
    IF v_user_id IS NULL THEN
      SELECT user_id,
             first_name || ' ' || last_name
        INTO v_user_id, v_full_name
        FROM public.team_members
       WHERE company_id = p_company_id
         AND lower(trim(first_name || ' ' || last_name)) = v_mention
         AND user_id IS NOT NULL
       LIMIT 1;
    END IF;

    -- Fallback: team_members partial first-name match
    IF v_user_id IS NULL THEN
      SELECT user_id,
             first_name || ' ' || last_name
        INTO v_user_id, v_full_name
        FROM public.team_members
       WHERE company_id = p_company_id
         AND lower(first_name) = split_part(v_mention, ' ', 1)
         AND user_id IS NOT NULL
       LIMIT 1;
    END IF;

    -- Insert notification (skip duplicates)
    IF v_user_id IS NOT NULL AND NOT (v_user_id = ANY(v_already)) THEN
      INSERT INTO public.notifications
        (user_id, company_id, title, message, type, category, is_read, related_id, related_table)
      VALUES
        (v_user_id, p_company_id,
         'Sie wurden in einer Aufgabe erwähnt',
         p_sender_name || ' hat Sie in einer Aufgabe erwähnt: "' || p_task_title || '"',
         'info', 'task', false, p_task_id, 'tasks');
      v_count  := v_count + 1;
      v_already := v_already || v_user_id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.notify_task_mentions TO authenticated;

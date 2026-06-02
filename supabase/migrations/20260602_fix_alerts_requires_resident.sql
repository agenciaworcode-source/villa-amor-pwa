-- ══════════════════════════════════════════════════════════════════════════════
-- VILLA AMOR — Corrigir alertas gerados para POPs sem vínculo com residente
-- Execute no Supabase SQL Editor
-- Data: 2026-06-02
-- ══════════════════════════════════════════════════════════════════════════════
-- Problema: check_late_executions() gerava alertas de step_late e pop_not_started
-- para POPs de manutenção/cozinha/limpeza (requires_resident = false), exibindo
-- nome de residente incorretamente no dashboard.
-- Solução: filtrar p.requires_resident = true em todas as seções relevantes.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Remover alertas incorretos já gerados para POPs sem residente
DELETE FROM alerts
WHERE id IN (
  SELECT a.id
  FROM alerts a
  JOIN executions e ON e.id = a.execution_id
  JOIN pops p ON p.id = e.pop_id
  WHERE p.requires_resident = false
    AND a.acknowledged_at IS NULL
);

DELETE FROM alerts
WHERE type = 'pop_not_started'
  AND acknowledged_at IS NULL
  AND resident_id IN (
    SELECT DISTINCT a.resident_id
    FROM alerts a
    WHERE a.type = 'pop_not_started'
      AND a.acknowledged_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM executions e
        JOIN pops p ON p.id = e.pop_id
        WHERE e.resident_id = a.resident_id
          AND p.requires_resident = true
      )
  );

-- 2. Recriar a função corrigida
CREATE OR REPLACE FUNCTION check_late_executions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN

  -- ============================================================
  -- 1. Marcar execuções como late e criar alertas step_late
  --    Apenas POPs que exigem residente (requires_resident = true)
  -- ============================================================
  FOR rec IN
    SELECT
      e.id            AS execution_id,
      e.resident_id,
      p.name          AS pop_name,
      r.name          AS resident_name
    FROM executions e
    JOIN pops p          ON p.id = e.pop_id
    JOIN residents r     ON r.id = e.resident_id
    WHERE e.status = 'in_progress'
      AND p.requires_resident = true
      AND p.deadline_time IS NOT NULL
      AND (current_date::text || ' ' || p.deadline_time::text)::timestamptz
            + (p.tolerance_minutes || ' minutes')::interval
          < now()
  LOOP
    UPDATE executions
    SET status = 'late'
    WHERE id = rec.execution_id
      AND status = 'in_progress';

    INSERT INTO alerts (type, execution_id, resident_id, severity, message, triggered_at)
    SELECT
      'step_late',
      rec.execution_id,
      rec.resident_id,
      'high',
      'Execução atrasada: ' || rec.pop_name || ' — ' || rec.resident_name,
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'step_late'
        AND execution_id = rec.execution_id
        AND acknowledged_at IS NULL
    );
  END LOOP;

  -- Execuções já marcadas como late
  FOR rec IN
    SELECT
      e.id            AS execution_id,
      e.resident_id,
      p.name          AS pop_name,
      r.name          AS resident_name
    FROM executions e
    JOIN pops p          ON p.id = e.pop_id
    JOIN residents r     ON r.id = e.resident_id
    WHERE e.status = 'late'
      AND p.requires_resident = true
  LOOP
    INSERT INTO alerts (type, execution_id, resident_id, severity, message, triggered_at)
    SELECT
      'step_late',
      rec.execution_id,
      rec.resident_id,
      'high',
      'Execução atrasada: ' || rec.pop_name || ' — ' || rec.resident_name,
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'step_late'
        AND execution_id = rec.execution_id
        AND acknowledged_at IS NULL
    );
  END LOOP;

  -- ============================================================
  -- 2. Criar alertas pop_not_started
  --    Apenas POPs que exigem residente (requires_resident = true)
  -- ============================================================
  FOR rec IN
    SELECT
      rpa.resident_id,
      p.name          AS pop_name,
      r.name          AS resident_name
    FROM resident_pop_assignments rpa
    JOIN pops p          ON p.id = rpa.pop_id
    JOIN residents r     ON r.id = rpa.resident_id
    WHERE rpa.active = true
      AND p.requires_resident = true
      AND p.start_time_expected IS NOT NULL
      AND (current_date::text || ' ' || p.start_time_expected::text)::timestamptz
            + (p.tolerance_minutes || ' minutes')::interval
          < now()
      AND NOT EXISTS (
        SELECT 1 FROM executions e
        WHERE e.resident_id = rpa.resident_id
          AND e.pop_id = rpa.pop_id
          AND e.created_at::date = current_date
      )
  LOOP
    INSERT INTO alerts (type, resident_id, severity, message, triggered_at)
    SELECT
      'pop_not_started',
      rec.resident_id,
      'high',
      'POP não iniciado: ' || rec.pop_name || ' — ' || rec.resident_name,
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'pop_not_started'
        AND resident_id = rec.resident_id
        AND message = 'POP não iniciado: ' || rec.pop_name || ' — ' || rec.resident_name
        AND triggered_at::date = current_date
        AND acknowledged_at IS NULL
    );
  END LOOP;

  -- ============================================================
  -- 3. Criar alertas checkout_missing
  -- ============================================================
  FOR rec IN
    SELECT s.id AS shift_id
    FROM shifts s
    WHERE s.started_at::date = current_date
      AND s.ended_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM shift_handovers sh
        WHERE sh.shift_from_id = s.id
      )
  LOOP
    INSERT INTO alerts (type, severity, message, triggered_at)
    SELECT
      'checkout_missing',
      'medium',
      'Passagem de plantão não registrada',
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'checkout_missing'
        AND triggered_at::date = current_date
        AND acknowledged_at IS NULL
    );
  END LOOP;

END;
$$;

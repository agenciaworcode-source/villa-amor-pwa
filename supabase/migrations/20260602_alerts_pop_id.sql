-- ══════════════════════════════════════════════════════════════════════════════
-- VILLA AMOR — Adicionar pop_id em alerts + filtro por role na função de cron
-- Execute no Supabase SQL Editor
-- Data: 2026-06-02
-- ══════════════════════════════════════════════════════════════════════════════
-- Objetivo: cada alerta sabe de qual POP veio, permitindo filtrar por role do
-- colaborador (ex: alertas de manutenção só aparecem para a equipe de manutenção)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Adicionar coluna pop_id na tabela alerts
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS pop_id uuid REFERENCES pops(id) ON DELETE SET NULL;

-- 2. Recriar a função com pop_id populado em todos os inserts relevantes
CREATE OR REPLACE FUNCTION check_late_executions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN

  -- ============================================================
  -- 1. step_late — execuções in_progress que passaram do prazo
  -- ============================================================
  FOR rec IN
    SELECT
      e.id            AS execution_id,
      e.pop_id,
      e.resident_id,
      p.name          AS pop_name,
      r.name          AS resident_name
    FROM executions e
    JOIN pops p      ON p.id = e.pop_id
    JOIN residents r ON r.id = e.resident_id
    WHERE e.status = 'in_progress'
      AND p.requires_resident = true
      AND p.deadline_time IS NOT NULL
      AND (current_date::text || ' ' || p.deadline_time::text)::timestamptz
            + (p.tolerance_minutes || ' minutes')::interval
          < now()
  LOOP
    UPDATE executions SET status = 'late'
    WHERE id = rec.execution_id AND status = 'in_progress';

    INSERT INTO alerts (type, execution_id, pop_id, resident_id, severity, message, triggered_at)
    SELECT 'step_late', rec.execution_id, rec.pop_id, rec.resident_id, 'high',
           'Execução atrasada: ' || rec.pop_name || ' — ' || rec.resident_name, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'step_late' AND execution_id = rec.execution_id AND acknowledged_at IS NULL
    );
  END LOOP;

  -- step_late — execuções já marcadas como late sem alerta pendente
  FOR rec IN
    SELECT
      e.id            AS execution_id,
      e.pop_id,
      e.resident_id,
      p.name          AS pop_name,
      r.name          AS resident_name
    FROM executions e
    JOIN pops p      ON p.id = e.pop_id
    JOIN residents r ON r.id = e.resident_id
    WHERE e.status = 'late'
      AND p.requires_resident = true
  LOOP
    INSERT INTO alerts (type, execution_id, pop_id, resident_id, severity, message, triggered_at)
    SELECT 'step_late', rec.execution_id, rec.pop_id, rec.resident_id, 'high',
           'Execução atrasada: ' || rec.pop_name || ' — ' || rec.resident_name, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'step_late' AND execution_id = rec.execution_id AND acknowledged_at IS NULL
    );
  END LOOP;

  -- ============================================================
  -- 2. pop_not_started — POPs que deveriam ter começado
  -- ============================================================
  FOR rec IN
    SELECT
      rpa.resident_id,
      rpa.pop_id,
      p.name          AS pop_name,
      r.name          AS resident_name
    FROM resident_pop_assignments rpa
    JOIN pops p      ON p.id = rpa.pop_id
    JOIN residents r ON r.id = rpa.resident_id
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
    INSERT INTO alerts (type, pop_id, resident_id, severity, message, triggered_at)
    SELECT 'pop_not_started', rec.pop_id, rec.resident_id, 'high',
           'POP não iniciado: ' || rec.pop_name || ' — ' || rec.resident_name, now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'pop_not_started'
        AND pop_id = rec.pop_id
        AND resident_id = rec.resident_id
        AND triggered_at::date = current_date
        AND acknowledged_at IS NULL
    );
  END LOOP;

  -- ============================================================
  -- 3. checkout_missing — turno encerrado sem passagem de plantão
  -- ============================================================
  FOR rec IN
    SELECT s.id AS shift_id
    FROM shifts s
    WHERE s.started_at::date = current_date
      AND s.ended_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM shift_handovers sh WHERE sh.shift_from_id = s.id
      )
  LOOP
    INSERT INTO alerts (type, severity, message, triggered_at)
    SELECT 'checkout_missing', 'medium', 'Passagem de plantão não registrada', now()
    WHERE NOT EXISTS (
      SELECT 1 FROM alerts
      WHERE type = 'checkout_missing'
        AND triggered_at::date = current_date
        AND acknowledged_at IS NULL
    );
  END LOOP;

END;
$$;

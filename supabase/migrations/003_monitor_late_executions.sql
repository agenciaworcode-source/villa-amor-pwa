-- Migration: 003_monitor_late_executions
-- Função de monitoramento de execuções atrasadas, POPs não iniciados e passagens de plantão ausentes.

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
      AND p.deadline_time IS NOT NULL
      AND (current_date::text || ' ' || p.deadline_time::text)::timestamptz
            + (p.tolerance_minutes || ' minutes')::interval
          < now()
  LOOP
    -- Atualizar status para late
    UPDATE executions
    SET status = 'late'
    WHERE id = rec.execution_id
      AND status = 'in_progress';

    -- Inserir alerta step_late (deduplicado por execution_id)
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

  -- Criar alertas step_late também para execuções que já estavam late (sem alerta pendente)
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

-- Para agendar via pg_cron (habilitar extensão no Supabase: Dashboard > Database > Extensions > pg_cron):
-- SELECT cron.schedule('check-late-executions', '* * * * *', 'SELECT check_late_executions()');

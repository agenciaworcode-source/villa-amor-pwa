-- ══════════════════════════════════════════════════════════════════════════════
-- VILLA AMOR — Corrigir FK constraints para permitir exclusão de usuários
-- Execute no Supabase SQL Editor
-- Data: 2026-06-02
-- ══════════════════════════════════════════════════════════════════════════════
-- Problema: excluir um usuário que possui execuções, ocorrências, alertas ou
-- passagens de plantão falha com "Database error deleting user" porque essas
-- tabelas têm FK → users(id) sem ON DELETE SET NULL.
-- Solução: trocar para ON DELETE SET NULL, preservando o histórico de dados.
-- ══════════════════════════════════════════════════════════════════════════════

-- executions.user_id → users(id)
ALTER TABLE executions
  DROP CONSTRAINT IF EXISTS executions_user_id_fkey;
ALTER TABLE executions
  ADD CONSTRAINT executions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- incidents.reported_by → users(id)
ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_reported_by_fkey;
ALTER TABLE incidents
  ADD CONSTRAINT incidents_reported_by_fkey
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL;

-- alerts.acknowledged_by → users(id)
ALTER TABLE alerts
  DROP CONSTRAINT IF EXISTS alerts_acknowledged_by_fkey;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_acknowledged_by_fkey
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL;

-- shift_handovers (só executa se a tabela já existir no banco)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_handovers') THEN
    ALTER TABLE shift_handovers
      DROP CONSTRAINT IF EXISTS shift_handovers_user_from_id_fkey;
    ALTER TABLE shift_handovers
      ADD CONSTRAINT shift_handovers_user_from_id_fkey
      FOREIGN KEY (user_from_id) REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE shift_handovers
      DROP CONSTRAINT IF EXISTS shift_handovers_user_to_id_fkey;
    ALTER TABLE shift_handovers
      ADD CONSTRAINT shift_handovers_user_to_id_fkey
      FOREIGN KEY (user_to_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

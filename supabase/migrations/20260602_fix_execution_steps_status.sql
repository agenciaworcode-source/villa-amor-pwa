-- ══════════════════════════════════════════════════════════════════════════════
-- VILLA AMOR — Corrigir CHECK constraint de execution_steps.status
-- Execute no Supabase SQL Editor
-- Data: 2026-06-02
-- ══════════════════════════════════════════════════════════════════════════════
-- Problema: aplicativo insere status 'in_progress' no check-in do passo, mas
-- a tabela só aceita ('pending', 'completed', 'skipped') → violação de constraint
-- → "Erro ao registrar início".
-- Solução: adicionar 'in_progress' aos valores permitidos.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE execution_steps
  DROP CONSTRAINT IF EXISTS execution_steps_status_check;

ALTER TABLE execution_steps
  ADD CONSTRAINT execution_steps_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- ══════════════════════════════════════════════════════════════════════════════
-- Habilitar Realtime na tabela execution_steps
-- Necessário para o dashboard admin receber atualizações em tempo real
-- quando colaboradores concluem etapas no mobile
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE execution_steps;

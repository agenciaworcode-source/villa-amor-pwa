-- ============================================================
-- Migração: Expansão de roles profissionais
-- Adiciona roles específicos ao enum user_role
--
-- IMPORTANTE: ALTER TYPE ADD VALUE não pode ser usado dentro de
-- uma transação que também reference os novos valores.
-- As CHECK constraints são desnecessárias — o enum já valida.
-- ============================================================

-- Adicionar novos valores ao enum user_role
-- Cada ADD VALUE é idempotente com IF NOT EXISTS
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'enfermeiro';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fisioterapeuta';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'psicologo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'nutricionista';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cozinheiro';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'limpeza';

-- Comentários de documentação (não referenciam os novos valores)
COMMENT ON COLUMN users.role IS
  'Roles: admin, supervisor (painel) | operational, enfermeiro, fisioterapeuta, psicologo, nutricionista, cozinheiro, limpeza (mobile)';

COMMENT ON COLUMN pops.role_type IS
  'Tipo de profissional responsável pelo POP. Um POP = um tipo profissional.';

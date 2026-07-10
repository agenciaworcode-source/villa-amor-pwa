-- ============================================================
-- PASSO 1 — Rode este bloco PRIMEIRO e espere terminar.
-- Adiciona os novos valores ao enum dependency_level.
-- O PostgreSQL exige que eles sejam commitados antes de serem usados.
-- ============================================================

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS sexuality         text        NULL,
  ADD COLUMN IF NOT EXISTS entry_date        date        NULL,
  ADD COLUMN IF NOT EXISTS exit_date         date        NULL,
  ADD COLUMN IF NOT EXISTS exit_reason       text        NULL,
  ADD COLUMN IF NOT EXISTS payment_day       int         NULL,
  ADD COLUMN IF NOT EXISTS payment_modality  text        NULL,
  ADD COLUMN IF NOT EXISTS stay_type         text        NULL,
  ADD COLUMN IF NOT EXISTS is_prospect       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_value     numeric     NULL,
  ADD COLUMN IF NOT EXISTS photo_url         text        NULL;

ALTER TYPE dependency_level ADD VALUE IF NOT EXISTS 'g1';
ALTER TYPE dependency_level ADD VALUE IF NOT EXISTS 'g2';
ALTER TYPE dependency_level ADD VALUE IF NOT EXISTS 'g3';

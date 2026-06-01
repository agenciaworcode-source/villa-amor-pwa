-- Migration: POP assignments per resident + staff rotation
-- Execute via Supabase SQL Editor

-- ── 1. Atribuição de POP por residente ────────────────────────────────────────
-- Cada residente tem seu próprio conjunto de POPs ativos (plano de cuidados individual)
CREATE TABLE IF NOT EXISTS resident_pop_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id  uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  pop_id       uuid NOT NULL REFERENCES pops(id)      ON DELETE CASCADE,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(resident_id, pop_id)
);

CREATE INDEX IF NOT EXISTS idx_rpa_resident ON resident_pop_assignments(resident_id);
CREATE INDEX IF NOT EXISTS idx_rpa_pop      ON resident_pop_assignments(pop_id);

COMMENT ON TABLE resident_pop_assignments IS
  'Define quais POPs estão atribuídos a cada residente (plano de cuidados individual).';

-- ── 2. Rodízio de colaboradores por POP ───────────────────────────────────────
-- Para POPs do tipo multiprofissional, define a ordem de rodízio entre colaboradores.
-- O sistema usa last_assigned_date para saber quem é o próximo: quem foi designado
-- há mais tempo (ou nunca) é o próximo da fila.
CREATE TABLE IF NOT EXISTS pop_staff_rotation (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id             uuid NOT NULL REFERENCES pops(id)  ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_index        int  NOT NULL DEFAULT 0,
  last_assigned_date date,                     -- último dia em que este colaborador foi designado
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  UNIQUE(pop_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_psr_pop  ON pop_staff_rotation(pop_id);
CREATE INDEX IF NOT EXISTS idx_psr_user ON pop_staff_rotation(user_id);

COMMENT ON TABLE pop_staff_rotation IS
  'Rodízio de colaboradores multiprofissionais para POPs. '
  'Quem tem last_assigned_date mais antiga (ou NULL) é o próximo da fila.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE resident_pop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pop_staff_rotation       ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler
CREATE POLICY "read_rpa"  ON resident_pop_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_psr"  ON pop_staff_rotation       FOR SELECT TO authenticated USING (true);

-- Apenas admin/supervisor podem escrever
CREATE POLICY "write_rpa" ON resident_pop_assignments FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

CREATE POLICY "write_psr" ON pop_staff_rotation FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

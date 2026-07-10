-- ============================================================
-- VILLA AMOR — Expansão Sprint 2026-07-01
-- Escopo:
--   1. Novos roles profissionais (enum)
--   2. Múltiplas profissões por colaborador (user_roles)
--   3. Edição de e-mail (campo na tabela users)
--   4. Documentos do colaborador (user_documents + storage policy)
--   5. Regras de POP por profissão + turno (pop_role_assignments, etc.)
-- ============================================================
-- Execute inteiro no Supabase SQL Editor.
-- Todas as operações são idempotentes (IF NOT EXISTS / IF EXISTS).
-- ============================================================


-- ============================================================
-- BLOCO 1 — Novos roles profissionais no enum user_role
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manutencao';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'terapia_ocupacional';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'estagiario';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'menor_aprendiz';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'resp_tecnica';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'musicoterapeuta';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fonoaudiologa';

COMMENT ON TYPE user_role IS
  'Roles do sistema Villa Amor. '
  'Painel: admin, supervisor. '
  'Mobile/operacional: operational, enfermeiro, fisioterapeuta, psicologo, '
  'nutricionista, cozinheiro, limpeza, manutencao, terapia_ocupacional, '
  'estagiario, menor_aprendiz, marketing, resp_tecnica, musicoterapeuta, fonoaudiologa.';


-- ============================================================
-- BLOCO 2 — Múltiplas profissões por colaborador
-- ============================================================

-- Tabela de roles múltiplos (um colaborador pode ter N profissões)
CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL,
  is_primary  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

COMMENT ON TABLE user_roles IS
  'Profissões múltiplas por colaborador. '
  'is_primary=true indica a profissão principal (exatamente uma por colaborador).';

-- Garantir que só existe um role primário por colaborador
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_primary
  ON user_roles(user_id)
  WHERE is_primary = true;

-- RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_read" ON user_roles;
CREATE POLICY "user_roles_read" ON user_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_write" ON user_roles;
CREATE POLICY "user_roles_write" ON user_roles
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- Seed: migrar roles existentes da tabela users para user_roles
-- (só insere se user_roles ainda estiver vazio para o usuário)
INSERT INTO user_roles (user_id, role, is_primary)
SELECT id, role, true
FROM users
WHERE active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = users.id
  )
ON CONFLICT DO NOTHING;


-- ============================================================
-- BLOCO 3 — Campo de observação global no colaborador
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN users.notes IS
  'Observações livres sobre o colaborador (visível apenas para admin/supervisor).';


-- ============================================================
-- BLOCO 4 — Documentos do colaborador
-- ============================================================

-- Enum: tipo de vínculo trabalhista
DO $$ BEGIN
  CREATE TYPE employee_type AS ENUM ('pf', 'pj', 'pcd');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum: categoria do documento
DO $$ BEGIN
  CREATE TYPE employee_doc_category AS ENUM (
    'identificacao',        -- RG, CNH, CPF, título, reservista, nascimento/casamento
    'comprovante',          -- comprovante de residência
    'escolaridade',         -- diploma, certificado
    'trabalhista',          -- CTPS, PIS/PASEP, carteira de classe
    'saude',                -- ASO admissional
    'beneficios',           -- dados bancários, vale-transporte
    'dependentes',          -- docs dos dependentes
    'empresa',              -- contrato social, CNPJ, inscrição municipal
    'regularidade',         -- CND, FGTS, DAS MEI
    'contrato_prestacao',   -- contrato de prestação de serviços PJ
    'inss_beneficio',       -- carta de concessão, extrato INSS (PcD)
    'outros'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_documents (
  id              uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_type   employee_type         NOT NULL DEFAULT 'pf',
  category        employee_doc_category NOT NULL,
  doc_name        text                  NOT NULL,   -- ex: "RG", "CPF", "ASO Admissional"
  storage_path    text,                             -- caminho no Supabase Storage bucket user-documents
  file_name       text,                             -- nome original do arquivo
  file_size_bytes int,
  mime_type       text,
  notes           text,                             -- observação específica deste documento
  status          text NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('pendente', 'enviado', 'validado', 'rejeitado')),
  uploaded_at     timestamptz,
  uploaded_by     uuid REFERENCES users(id),
  validated_at    timestamptz,
  validated_by    uuid REFERENCES users(id),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user   ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);

COMMENT ON TABLE user_documents IS
  'Documentos admissionais do colaborador (PF, PJ ou PcD). '
  'Cada linha representa um tipo de documento com status de envio e validação.';

-- RLS
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_documents_read_own" ON user_documents;
CREATE POLICY "user_documents_read_own" ON user_documents
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "user_documents_write_admin" ON user_documents;
CREATE POLICY "user_documents_write_admin" ON user_documents
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "user_documents_upload_own" ON user_documents;
CREATE POLICY "user_documents_upload_own" ON user_documents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Seed: criar checklist padrão de documentos para colaboradores PF existentes
-- (apenas insere se ainda não houver documentos para o colaborador)
INSERT INTO user_documents (user_id, employee_type, category, doc_name, status)
SELECT
  u.id,
  'pf',
  cat.category::employee_doc_category,
  cat.doc_name,
  'pendente'
FROM users u
CROSS JOIN (VALUES
  ('identificacao',   'RG ou CNH'),
  ('identificacao',   'CPF'),
  ('identificacao',   'Título de Eleitor'),
  ('identificacao',   'Certidão de Nascimento ou Casamento'),
  ('comprovante',     'Comprovante de Residência'),
  ('escolaridade',    'Comprovante de Escolaridade / Diploma'),
  ('trabalhista',     'Carteira de Trabalho (CTPS Digital)'),
  ('trabalhista',     'Cartão PIS/PASEP'),
  ('saude',           'ASO Admissional'),
  ('beneficios',      'Dados Bancários'),
  ('beneficios',      'Comprovante de Endereço para Vale-Transporte')
) AS cat(category, doc_name)
WHERE u.active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_documents ud WHERE ud.user_id = u.id
  )
ON CONFLICT DO NOTHING;


-- ============================================================
-- BLOCO 5 — Storage bucket policy para user-documents
-- (cria a policy no storage; o bucket deve ser criado manualmente
--  no painel Supabase > Storage > New bucket: "user-documents", private)
-- ============================================================

-- Policy de leitura: próprio colaborador + admin/supervisor
DROP POLICY IF EXISTS "user_documents_storage_read" ON storage.objects;
CREATE POLICY "user_documents_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'supervisor')
    )
  );

-- Policy de upload: próprio colaborador + admin/supervisor
DROP POLICY IF EXISTS "user_documents_storage_insert" ON storage.objects;
CREATE POLICY "user_documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'supervisor')
    )
  );

-- Policy de delete: admin/supervisor apenas
DROP POLICY IF EXISTS "user_documents_storage_delete" ON storage.objects;
CREATE POLICY "user_documents_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );


-- ============================================================
-- BLOCO 6 — Regras de POP por profissão
-- ============================================================

-- Vincular um POP a múltiplas profissões (além do role_type principal)
CREATE TABLE IF NOT EXISTS pop_role_assignments (
  pop_id      uuid       NOT NULL REFERENCES pops(id) ON DELETE CASCADE,
  role        user_role  NOT NULL,
  is_primary  boolean    NOT NULL DEFAULT false,  -- true = role_type principal do POP
  enabled     boolean    NOT NULL DEFAULT true,   -- permite desabilitar por profissão sem deletar
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (pop_id, role)
);

CREATE INDEX IF NOT EXISTS idx_pra_pop  ON pop_role_assignments(pop_id);
CREATE INDEX IF NOT EXISTS idx_pra_role ON pop_role_assignments(role);

COMMENT ON TABLE pop_role_assignments IS
  'Vincula um POP a múltiplas profissões. enabled=false desabilita sem remover o vínculo.';

-- Seed: migrar role_type existente dos POPs para pop_role_assignments
INSERT INTO pop_role_assignments (pop_id, role, is_primary, enabled)
SELECT id, role_type, true, true
FROM pops
WHERE role_type IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pop_role_assignments pra
    WHERE pra.pop_id = pops.id AND pra.role = pops.role_type
  )
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE pop_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pra_read" ON pop_role_assignments;
CREATE POLICY "pra_read" ON pop_role_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pra_write" ON pop_role_assignments;
CREATE POLICY "pra_write" ON pop_role_assignments
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );


-- ============================================================
-- BLOCO 7 — POP principal e secundários por colaborador
-- ============================================================

-- POP principal do colaborador (coluna na tabela users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS primary_pop_id uuid REFERENCES pops(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.primary_pop_id IS
  'POP principal atribuído ao colaborador. Ativado automaticamente no início do turno.';

-- POPs secundários (aqueles que o colaborador também pode executar)
CREATE TABLE IF NOT EXISTS user_secondary_pops (
  user_id     uuid  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pop_id      uuid  NOT NULL REFERENCES pops(id)  ON DELETE CASCADE,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, pop_id)
);

CREATE INDEX IF NOT EXISTS idx_usp_user ON user_secondary_pops(user_id);
CREATE INDEX IF NOT EXISTS idx_usp_pop  ON user_secondary_pops(pop_id);

COMMENT ON TABLE user_secondary_pops IS
  'POPs secundários que um colaborador pode iniciar além do seu POP principal.';

-- RLS
ALTER TABLE user_secondary_pops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usp_read" ON user_secondary_pops;
CREATE POLICY "usp_read" ON user_secondary_pops
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "usp_write" ON user_secondary_pops;
CREATE POLICY "usp_write" ON user_secondary_pops
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );


-- ============================================================
-- BLOCO 8 — Regras de ativação de POP por turno
-- ============================================================

-- Colunas adicionais na tabela pops para controle de janela de ativação
ALTER TABLE pops
  ADD COLUMN IF NOT EXISTS activation_window_minutes  int NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS late_permission_minutes     int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS overlap_allowed             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS odd_days_only               boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN pops.activation_window_minutes IS
  'Minutos após o início do turno em que o POP pode ser iniciado livremente.';
COMMENT ON COLUMN pops.late_permission_minutes IS
  'Após este número de minutos sem início, o sistema envia pedido de aprovação ao ADM.';
COMMENT ON COLUMN pops.overlap_allowed IS
  'Se false, o colaborador não pode iniciar este POP enquanto outro estiver em andamento.';
COMMENT ON COLUMN pops.odd_days_only IS
  'Se true, o POP é válido apenas em dias ímpares do mês (turno de 16 dias em meses com 31 dias).';


-- ============================================================
-- BLOCO 9 — Solicitações de aprovação tardia de POP
-- ============================================================

DO $$ BEGIN
  CREATE TYPE pop_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS pop_late_approvals (
  id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id    uuid                REFERENCES executions(id) ON DELETE CASCADE,
  user_id         uuid                NOT NULL REFERENCES users(id),
  pop_id          uuid                NOT NULL REFERENCES pops(id),
  requested_at    timestamptz         DEFAULT now(),
  minutes_late    int,                -- quantos minutos após a janela
  status          pop_approval_status NOT NULL DEFAULT 'pending',
  reviewed_by     uuid                REFERENCES users(id),
  reviewed_at     timestamptz,
  review_notes    text
);

CREATE INDEX IF NOT EXISTS idx_pla_status  ON pop_late_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pla_user    ON pop_late_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_pla_pop     ON pop_late_approvals(pop_id);

COMMENT ON TABLE pop_late_approvals IS
  'Solicitações automáticas de aprovação quando um colaborador tenta iniciar um POP '
  'fora da janela permitida. O ADM recebe notificação e aprova/rejeita com um clique.';

-- RLS
ALTER TABLE pop_late_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pla_read" ON pop_late_approvals;
CREATE POLICY "pla_read" ON pop_late_approvals
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

DROP POLICY IF EXISTS "pla_insert_own" ON pop_late_approvals;
CREATE POLICY "pla_insert_own" ON pop_late_approvals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "pla_update_admin" ON pop_late_approvals;
CREATE POLICY "pla_update_admin" ON pop_late_approvals
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );


-- ============================================================
-- BLOCO 10 — View auxiliar: documentos pendentes por colaborador
-- (útil para o badge "Docs pendentes" no card da equipe)
-- ============================================================

CREATE OR REPLACE VIEW user_documents_summary AS
SELECT
  user_id,
  COUNT(*)                                          AS total_docs,
  COUNT(*) FILTER (WHERE status = 'enviado')        AS docs_enviados,
  COUNT(*) FILTER (WHERE status = 'validado')       AS docs_validados,
  COUNT(*) FILTER (WHERE status = 'pendente')       AS docs_pendentes,
  COUNT(*) FILTER (WHERE status = 'rejeitado')      AS docs_rejeitados
FROM user_documents
GROUP BY user_id;

COMMENT ON VIEW user_documents_summary IS
  'Resumo do status de documentos por colaborador. Use para exibir badges no painel.';


-- ============================================================
-- FIM DA MIGRATION — Villa Amor 2026-07-01
-- ============================================================

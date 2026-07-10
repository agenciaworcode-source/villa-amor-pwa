-- ============================================================
-- PASSO 2 — Rode APÓS o passo 1 ter sido executado com sucesso.
-- ============================================================

-- Migrar dados antigos: semi → g2, dependent → g3
UPDATE residents SET dependency_level = 'g2' WHERE dependency_level = 'semi';
UPDATE residents SET dependency_level = 'g3' WHERE dependency_level = 'dependent';

-- ============================================================
-- Tabela de responsáveis (múltiplos por residente)
-- ============================================================

CREATE TABLE IF NOT EXISTS resident_responsibles (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id          uuid        NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  relationship         text        NULL,
  cpf                  text        NULL,
  phone                text        NULL,
  email                text        NULL,
  address              text        NULL,
  is_primary           boolean     NOT NULL DEFAULT false,
  is_emergency_contact boolean     NOT NULL DEFAULT false,
  is_blocked           boolean     NOT NULL DEFAULT false,
  block_reason         text        NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Migrar responsável único existente → nova tabela
INSERT INTO resident_responsibles (resident_id, name, relationship, cpf, phone, email, address, is_primary, is_emergency_contact)
SELECT
  id,
  responsible_name,
  responsible_relationship,
  responsible_cpf,
  responsible_phone,
  responsible_email,
  responsible_address,
  true,
  true
FROM residents
WHERE responsible_name IS NOT NULL AND responsible_name <> ''
  AND NOT EXISTS (
    SELECT 1 FROM resident_responsibles rr WHERE rr.resident_id = residents.id
  )
ON CONFLICT DO NOTHING;

ALTER TABLE resident_responsibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_responsibles" ON resident_responsibles;
CREATE POLICY "authenticated_select_responsibles" ON resident_responsibles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_supervisor_manage_responsibles" ON resident_responsibles;
CREATE POLICY "admin_supervisor_manage_responsibles" ON resident_responsibles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

-- ============================================================
-- Tabela de documentos do residente
-- ============================================================

CREATE TABLE IF NOT EXISTS resident_documents (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id      uuid        NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  doc_type         text        NOT NULL,
  status           text        NOT NULL DEFAULT 'pendente',
  file_name        text        NULL,
  storage_path     text        NULL,
  file_size_bytes  bigint      NULL,
  mime_type        text        NULL,
  uploaded_at      timestamptz NULL,
  uploaded_by      uuid        NULL REFERENCES users(id),
  notes            text        NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed checklist padrão para todos os residentes ativos
INSERT INTO resident_documents (resident_id, doc_type, status)
SELECT r.id, d.doc_type, 'pendente'
FROM residents r
CROSS JOIN (VALUES
  ('rg'),
  ('cpf'),
  ('vacina'),
  ('contrato_social'),
  ('plano_saude'),
  ('plano_funerario'),
  ('comprovante_residencia')
) AS d(doc_type)
WHERE r.active = true
  AND NOT EXISTS (
    SELECT 1 FROM resident_documents rd WHERE rd.resident_id = r.id
  )
ON CONFLICT DO NOTHING;

ALTER TABLE resident_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_res_docs" ON resident_documents;
CREATE POLICY "authenticated_select_res_docs" ON resident_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_supervisor_manage_res_docs" ON resident_documents;
CREATE POLICY "admin_supervisor_manage_res_docs" ON resident_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

-- ============================================================
-- Storage: bucket resident-documents
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('resident-documents', 'resident-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admin_supervisor_upload_res_docs"   ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_res_docs"        ON storage.objects;
DROP POLICY IF EXISTS "admin_supervisor_update_res_docs"   ON storage.objects;
DROP POLICY IF EXISTS "admin_supervisor_delete_res_docs"   ON storage.objects;

CREATE POLICY "admin_supervisor_upload_res_docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resident-documents' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

CREATE POLICY "authenticated_read_res_docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resident-documents');

CREATE POLICY "admin_supervisor_update_res_docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resident-documents' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

CREATE POLICY "admin_supervisor_delete_res_docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'resident-documents' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

-- ============================================================
-- Storage: bucket resident-photos (PÚBLICO — exibido em <img src>)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('resident-photos', 'resident-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_res_photos"              ON storage.objects;
DROP POLICY IF EXISTS "admin_supervisor_upload_res_photos" ON storage.objects;
DROP POLICY IF EXISTS "admin_supervisor_update_res_photos" ON storage.objects;
DROP POLICY IF EXISTS "admin_supervisor_delete_res_photos" ON storage.objects;

-- Leitura pública (bucket público — permite <img src> direto)
CREATE POLICY "public_read_res_photos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'resident-photos');

CREATE POLICY "admin_supervisor_upload_res_photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resident-photos' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

CREATE POLICY "admin_supervisor_update_res_photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resident-photos' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

CREATE POLICY "admin_supervisor_delete_res_photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'resident-photos' AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','supervisor'))
  );

-- ============================================================
-- Checklist de classificação G1/G2/G3 (placeholders)
-- Evelyn deve revisar perguntas e pontuações
-- ============================================================

CREATE TABLE IF NOT EXISTS dependency_checklist_questions (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index   int     NOT NULL,
  category      text    NOT NULL,
  question      text    NOT NULL,
  yes_points    int     NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true
);

INSERT INTO dependency_checklist_questions (order_index, category, question, yes_points) VALUES
  (1,  'mobilidade',   'O residente necessita de auxílio para locomoção (andar, levantar)?',       4),
  (2,  'mobilidade',   'O residente utiliza cadeira de rodas, andador ou muleta permanentemente?', 5),
  (3,  'mobilidade',   'O residente permanece acamado a maior parte do tempo?',                    7),
  (4,  'cognicao',     'O residente apresenta desorientação temporal ou espacial frequente?',      4),
  (5,  'cognicao',     'O residente necessita de supervisão constante por risco de queda ou fuga?',5),
  (6,  'cognicao',     'O residente apresenta diagnóstico de demência (Alzheimer, etc.)?',         4),
  (7,  'higiene',      'O residente necessita de auxílio total para banho e higiene pessoal?',     4),
  (8,  'higiene',      'O residente necessita de auxílio para troca de fraldas?',                  5),
  (9,  'alimentacao',  'O residente necessita de auxílio para se alimentar (dieta pastosa/enteral)?',4),
  (10, 'alimentacao',  'O residente recusa alimentação com frequência exigindo supervisão?',       3),
  (11, 'continencia',  'O residente apresenta incontinência urinária?',                            3),
  (12, 'continencia',  'O residente apresenta incontinência fecal?',                               4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- View para exportação em massa
-- ============================================================

CREATE OR REPLACE VIEW residents_export_view AS
SELECT
  r.id,
  r.name,
  r.nickname,
  r.birth_date,
  r.cpf,
  r.rg,
  r.room_number,
  r.dependency_level,
  r.is_bedridden,
  r.stay_type,
  r.payment_modality,
  r.payment_day,
  r.monthly_value,
  r.entry_date,
  r.exit_date,
  r.exit_reason,
  r.is_prospect,
  r.sexuality,
  r.health_insurance,
  r.active,
  r.created_at,
  rr.name  AS primary_responsible_name,
  rr.phone AS primary_responsible_phone,
  rr.email AS primary_responsible_email
FROM residents r
LEFT JOIN resident_responsibles rr
  ON rr.resident_id = r.id AND rr.is_primary = true;

-- SCHEMA VILLA AMOR PWA
-- Versão 3.1 (Completando estrutura de POPs, Steps e Alertas)
-- Data: 2026-05-09

-- 1. Novos Enums necessários (Se não existirem)
DO $$ BEGIN
    CREATE TYPE incident_type AS ENUM ('fall', 'infection', 'pressure_injury', 'hospitalization', 'death', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('pop_not_started', 'step_late', 'checkout_missing', 'incident');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM ('open', 'monitoring', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE doc_type AS ENUM ('exam', 'report', 'prescription', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE clinical_record_type AS ENUM ('evolution', 'assessment', 'prescription');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Estrutura de Blocos e Passos (POPs)
CREATE TABLE IF NOT EXISTS pop_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id uuid REFERENCES pops(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index int NOT NULL,
  start_time_expected time,
  deadline_time time,
  tolerance_minutes int DEFAULT 10,
  depends_on uuid REFERENCES pop_blocks(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pop_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid REFERENCES pop_blocks(id) ON DELETE CASCADE,
  order_index int NOT NULL,
  title text NOT NULL,
  description text,
  type step_type DEFAULT 'checkbox',
  is_mandatory boolean DEFAULT true,
  condition_text text,
  active_days int[], -- [1,2,3,4,5,6,7] (1=Seg, 7=Dom)
  has_time_limit boolean DEFAULT false,
  step_deadline_minutes int,
  created_at timestamptz DEFAULT now()
);

-- 3. Detalhes da Execução e Mídia
CREATE TABLE IF NOT EXISTS execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES executions(id) ON DELETE CASCADE,
  pop_step_id uuid REFERENCES pop_steps(id),
  status text CHECK (status IN ('pending', 'completed', 'skipped')) DEFAULT 'pending',
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_step_id uuid REFERENCES execution_steps(id) ON DELETE CASCADE,
  type text CHECK (type IN ('photo', 'video')),
  storage_path text NOT NULL,
  captured_at timestamptz DEFAULT now(),
  file_size_bytes int,
  duration_seconds int
);

-- 4. Alertas e Incidentes
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES residents(id),
  reported_by uuid REFERENCES users(id),
  type incident_type NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz NOT NULL,
  resolved_at timestamptz,
  status incident_status DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  execution_id uuid REFERENCES executions(id),
  resident_id uuid REFERENCES residents(id),
  severity alert_severity DEFAULT 'medium',
  message text,
  triggered_at timestamptz DEFAULT now(),
  acknowledged_by uuid REFERENCES users(id),
  acknowledged_at timestamptz
);

-- 5. Ativar RLS (Row Level Security)
ALTER TABLE pop_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- 6. Políticas Básicas de RLS (Exemplos iniciais)
-- Todos os autenticados podem ler os templates (POPs, Blocks, Steps)
CREATE POLICY "Allow read for authenticated" ON pop_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for authenticated" ON pop_steps FOR SELECT TO authenticated USING (true);

-- Operacionais só veem seus próprios steps executados
CREATE POLICY "Operational see own steps" ON execution_steps 
  FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM executions WHERE id = execution_id AND user_id = auth.uid()));

-- Admins e Supervisores veem tudo
CREATE POLICY "Admin full access pop_blocks" ON pop_blocks FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- (Repetir padrão para as outras tabelas conforme necessário)

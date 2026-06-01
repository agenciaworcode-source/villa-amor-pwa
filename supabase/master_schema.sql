-- MASTER SCHEMA VILLA AMOR PWA
-- Versao Final Consolidada (Base + POPs + Alertas)
-- Data: 2026-05-09
-- Descricao: Este script inicializa o banco do zero.

-- 1. ENUMS (Tipos Customizados)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'multiprofessional', 'operational');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dependency_level') THEN
        CREATE TYPE dependency_level AS ENUM ('independent', 'semi', 'dependent', 'bedridden');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
        CREATE TYPE shift_type AS ENUM ('morning', 'evening', 'night', 'all');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'execution_status') THEN
        CREATE TYPE execution_status AS ENUM ('pending', 'in_progress', 'completed', 'late', 'incomplete');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'step_type') THEN
        CREATE TYPE step_type AS ENUM ('photo', 'video', 'checkbox', 'conditional', 'timed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_type') THEN
        CREATE TYPE incident_type AS ENUM ('fall', 'infection', 'pressure_injury', 'hospitalization', 'death', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
        CREATE TYPE alert_type AS ENUM ('pop_not_started', 'step_late', 'checkout_missing', 'incident');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
        CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
        CREATE TYPE incident_status AS ENUM ('open', 'monitoring', 'resolved');
    END IF;
END $$;

-- 2. TABELAS BASE
CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nickname text,
  room_number text,
  birth_date date,
  dependency_level dependency_level DEFAULT 'independent',
  is_bedridden boolean DEFAULT false,
  photo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'operational',
  push_token text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  type shift_type NOT NULL,
  started_at timestamptz,
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS pops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role_type user_role NOT NULL,
  shift_type shift_type DEFAULT 'all',
  start_time_expected time,
  deadline_time time,
  tolerance_minutes int DEFAULT 10,
  active boolean DEFAULT true,
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 3. ESTRUTURA DO PROTOCOLO
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
  active_days int[],
  has_time_limit boolean DEFAULT false,
  step_deadline_minutes int,
  created_at timestamptz DEFAULT now()
);

-- 4. EXECUCAO
CREATE TABLE IF NOT EXISTS executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id uuid REFERENCES pops(id),
  resident_id uuid REFERENCES residents(id),
  user_id uuid REFERENCES users(id),
  shift_id uuid REFERENCES shifts(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status execution_status DEFAULT 'pending',
  geo_lat decimal,
  geo_lng decimal,
  created_at timestamptz DEFAULT now()
);

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

-- 5. MONITORAMENTO
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

-- 6. PASSAGEM DE PLANTAO
CREATE TABLE IF NOT EXISTS shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_from_id uuid REFERENCES shifts(id),
  shift_to_id uuid REFERENCES shifts(id),
  user_from_id uuid REFERENCES users(id),
  user_to_id uuid REFERENCES users(id),
  notes text NOT NULL,
  media_url text,
  recorded_at timestamptz DEFAULT now()
);

-- 7. SEGURANCA (RLS)
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE pop_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

-- 8. FUNCOES
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_residents_updated_at 
BEFORE UPDATE ON residents 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

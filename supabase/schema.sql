-- SCHEMA VILLA AMOR PWA
-- Versão 3.0 (Pivot PWA)

-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'multiprofessional', 'operational');
CREATE TYPE dependency_level AS ENUM ('independent', 'semi', 'dependent', 'bedridden');
CREATE TYPE shift_type AS ENUM ('morning', 'evening', 'night', 'all');
CREATE TYPE execution_status AS ENUM ('pending', 'in_progress', 'completed', 'late', 'incomplete');
CREATE TYPE step_type AS ENUM ('photo', 'video', 'checkbox', 'conditional', 'timed');

-- 2. Tabelas
CREATE TABLE residents (
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

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role user_role DEFAULT 'operational',
  push_token text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  type shift_type NOT NULL,
  started_at timestamptz,
  ended_at timestamptz
);

CREATE TABLE pops (
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

CREATE TABLE executions (
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

-- 3. RLS (Row Level Security)
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

-- Exemplo de política: Todos os usuários autenticados podem ler residentes ativos
CREATE POLICY "Read active residents" ON residents
  FOR SELECT USING (auth.role() = 'authenticated' AND active = true);

-- Usuários só podem ver seu próprio perfil
CREATE POLICY "Users view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 4. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON residents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

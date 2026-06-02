-- ══════════════════════════════════════════════════════════════════════════════
-- Tabela de configurações do sistema
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: apenas admins leem e escrevem
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_settings" ON system_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_write_settings" ON system_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Valores padrão
INSERT INTO system_settings (key, value) VALUES
  ('geofence_enabled',          'true'),
  ('geofence_lat',              '0'),
  ('geofence_lng',              '0'),
  ('geofence_radius_m',         '100'),
  ('camera_allow_gallery',      'false'),
  ('camera_max_video_seconds',  '30'),
  ('shift_morning_start',       '07:00'),
  ('shift_morning_end',         '19:00'),
  ('shift_evening_start',       '13:00'),
  ('shift_evening_end',         '19:00'),
  ('shift_night_start',         '19:00'),
  ('shift_night_end',           '07:00')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RLS POLICIES — Villa Amor PWA
-- Cole e rode TUDO de uma vez no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "auth_all_residents" ON residents;
CREATE POLICY "auth_all_residents" ON residents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_pops" ON pops;
CREATE POLICY "auth_all_pops" ON pops FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_pop_blocks" ON pop_blocks;
CREATE POLICY "auth_all_pop_blocks" ON pop_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_pop_steps" ON pop_steps;
CREATE POLICY "auth_all_pop_steps" ON pop_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_users" ON users;
CREATE POLICY "auth_all_users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_incidents" ON incidents;
CREATE POLICY "auth_all_incidents" ON incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_alerts" ON alerts;
CREATE POLICY "auth_all_alerts" ON alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_executions" ON executions;
CREATE POLICY "auth_all_executions" ON executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_execution_steps" ON execution_steps;
CREATE POLICY "auth_all_execution_steps" ON execution_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_shifts" ON shifts;
CREATE POLICY "auth_all_shifts" ON shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger: auto-inserir na tabela users quando auth user é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'operational')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ language plpgsql security definer;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

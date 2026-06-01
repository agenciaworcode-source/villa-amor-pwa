-- SEED DATA VILLA AMOR
-- Dados iniciais para desenvolvimento e testes
-- Data: 2026-05-09

-- 1. Inserir Residentes de Teste
INSERT INTO residents (name, nickname, room_number, dependency_level, is_bedridden, active)
VALUES 
  ('Sebastião Silva', 'Sr. Tião', 'Quarto 101', 'dependent', true, true),
  ('Maria Oliveira', 'Dona Maria', 'Quarto 102', 'semi', false, true),
  ('José dos Santos', 'Sr. Zé', 'Quarto 105', 'bedridden', true, true)
ON CONFLICT DO NOTHING;

-- 2. Inserir um POP de Exemplo (Troca de Fralda)
INSERT INTO pops (id, name, role_type, shift_type, tolerance_minutes, active)
VALUES 
  ('d290f1ee-6c54-4b01-90e6-d701748f0851', 'Troca de Fralda e Higiene', 'operational', 'all', 15, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 3. Inserir Blocos para o POP de Troca de Fralda
INSERT INTO pop_blocks (id, pop_id, name, order_index)
VALUES 
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Preparação e Materiais', 1),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Execução do Procedimento', 2),
  ('b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Finalização e Registro', 3)
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Passos (Steps) para o POP de Troca de Fralda
INSERT INTO pop_steps (id, block_id, order_index, title, description, type, is_mandatory)
VALUES 
  (gen_random_uuid(), 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 1, 'Lavar as mãos', 'Higienização inicial obrigatória.', 'checkbox', true),
  (gen_random_uuid(), 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 2, 'Reunir material', 'Fralda, lenços, luvas e pomada.', 'checkbox', true),
  (gen_random_uuid(), 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 1, 'Retirar fralda suja', 'Limpeza cuidadosa com lenços umedecidos.', 'checkbox', true),
  (gen_random_uuid(), 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 2, 'Foto da higiene', 'Evidência visual da limpeza realizada.', 'photo', true),
  (gen_random_uuid(), 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 3, 'Colocar fralda limpa', 'Verificar ajuste e conforto.', 'checkbox', true),
  (gen_random_uuid(), 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 1, 'Descarte correto', 'Resíduo infectante no lixo apropriado.', 'checkbox', true),
  (gen_random_uuid(), 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 2, 'Lavar as mãos final', 'Higienização pós-procedimento.', 'checkbox', true)
ON CONFLICT (id) DO NOTHING;

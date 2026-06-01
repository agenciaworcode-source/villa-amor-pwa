-- ══════════════════════════════════════════════════════════════════════════════
-- VILLA AMOR — MIGRAÇÃO: POPs sem residente + POP 003 Manutenção
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Adiciona coluna requires_resident (default true = comportamento atual)
ALTER TABLE pops
  ADD COLUMN IF NOT EXISTS requires_resident BOOLEAN NOT NULL DEFAULT true;

-- 2. Marca POPs de cozinha e limpeza geral como sem residente
--    (aplica a POPs já existentes cujo role_type seja cozinheiro ou limpeza)
UPDATE pops
  SET requires_resident = false
  WHERE role_type IN ('cozinheiro', 'limpeza')
    AND requires_resident = true;

-- 3. Torna resident_id nullable em executions (caso não seja)
ALTER TABLE executions
  ALTER COLUMN resident_id DROP NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- POP 003 — PROTOCOLO PROFISSIONAL DE APOIO E MANUTENÇÃO
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  pop_id      UUID;
  bloco1_id   UUID;
  bloco2_id   UUID;
  bloco3_id   UUID;
  bloco4_id   UUID;
  bloco5_id   UUID;
  bloco6_id   UUID;
  bloco7_id   UUID;
BEGIN

-- ── Insere o POP ──────────────────────────────────────────────────────────────
INSERT INTO pops (
  name, role_type, shift_type,
  start_time_expected, deadline_time, tolerance_minutes,
  requires_resident, active, version
) VALUES (
  'POP 003 — Protocolo de Apoio e Manutenção',
  'limpeza',
  'morning',
  '07:00', '13:00', 30,
  false,   -- não precisa de residente
  true, 1
)
RETURNING id INTO pop_id;

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 1 — Atividades Diárias
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, start_time_expected, deadline_time, tolerance_minutes)
VALUES (pop_id, 'Atividades Diárias', 1, '07:00', '09:00', 15)
RETURNING id INTO bloco1_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco1_id, 1, 'Organizar pertences e receber instruções do supervisor',
 'Guardar pertences pessoais no espaço designado aos funcionários. Buscar instruções de demandas variáveis do dia com o supervisor responsável. Verificar e utilizar os EPIs obrigatórios antes de iniciar qualquer atividade.',
 'checkbox', true),

(bloco1_id, 2, 'Recolhimento do lixo',
 'Dirigir-se à varanda dos quartos: identificar os 3 lixos no corredor (fraldas e resíduos da noite anterior). Verificar se estão fechados; selar se necessário. Levar à lixeira externa. Depois ir à lixeira externa da cozinha, verificar vedação e descartar na lixeira externa da instituição.',
 'checkbox', true),

(bloco1_id, 3, 'Alimentação e limpeza dos animais',
 'Buscar as rações na ferramentaria. Alimentar e higienizar os espaços de: Coelhos, Cavalos (2x ao dia — 500g por vez), Peixes, Tartaruga. Hidratação e alimentação de coelhos, peixes e tartaruga: 1x/dia. Descartar dejetos e resíduos adequadamente.',
 'checkbox', true),

(bloco1_id, 4, 'Cuidado e análise das plantas (frente/fundo)',
 '1ª área — ENTRADA: limpeza das folhagens do lago, rastelo da mangueira, solo ao redor e equipamentos da academia (cartão de visita da casa). 2ª área — GRAMADO DA PISCINA: recolher folhas, copos, papéis e objetos fora do lugar. 3ª área — FUNDO E ESPAÇO DOS FUNCIONÁRIOS: itens fora do lugar, rastelo de folhas, descarte de lixo, deixar o ambiente organizado.',
 'checkbox', true),

(bloco1_id, 5, 'Análise de sujidade de todos os ambientes',
 'Percorrer todos os ambientes da instituição. Observar e registrar tudo que necessite manutenção. Depositar na caixinha de Demandas para acesso do supervisor. Verificar: focos de dengue, locais propícios a vetores/pragas/parasitas, banheiros (entupimento, inclusive caixa de gordura).',
 'checkbox', true),

(bloco1_id, 6, 'Checagem de itens de segurança e apagar luzes',
 'Certificar-se de que todos os itens solicitados pelo Corpo de Bombeiros estão em funcionamento. Caso algo esteja violado ou não funcionando, comunicar imediatamente para rastrear o plantão da ocorrência. Apagar todas as luzes desnecessárias da instituição.',
 'checkbox', true);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 2 — Piscina: Filtragem Diária
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, start_time_expected, deadline_time, tolerance_minutes)
VALUES (pop_id, 'Piscina — Filtragem Diária', 2, '07:30', '08:00', 10)
RETURNING id INTO bloco2_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco2_id, 1, 'Filtragem da piscina',
 'Ligar o sistema de filtragem. Duração: 4 a 8 horas conforme instruções do fabricante do filtro. ATENÇÃO: nos dias em que forem realizadas ações de tratamento (cloração, controle de pH etc.), a filtragem deve ser feita EM SEGUIDA (não antes), para otimizar a limpeza.',
 'checkbox', true);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 3 — Piscina: Tratamento Semanal (Terça e Sexta)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, start_time_expected, deadline_time, tolerance_minutes)
VALUES (pop_id, 'Piscina — Tratamento Semanal (terça e sexta)', 3, '08:00', '09:30', 15)
RETURNING id INTO bloco3_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco3_id, 1, 'Controle de cloro',
 'Aplicar no início do expediente para evitar evaporação pelo sol. Em piscinas de vinil ou fibra: diluir o cloro em um balde com água da piscina antes de aplicar. Filtrar depois. Na manhã seguinte: verificar o cloro livre com kit de medição (deve estar entre 1 e 3 ppm). Se fora do padrão, suspender uso da piscina.',
 'checkbox', true),

(bloco3_id, 2, 'Controle de pH',
 'Medir o pH (deve ficar entre 7 e 7,4). Usar fita de teste ou kit colorimétrico. Para corrigir: Redutor de pH (Sulfato de Alumínio) para abaixar; Barrilha Leve para elevantar. Após correção, realizar filtragem. IMPORTANTE: controle de pH deve ser feito ANTES de qualquer tratamento químico (exceto nos dias de hipoclorito de sódio, diclorvos e tricloros).',
 'checkbox', true),

(bloco3_id, 3, 'Aspiração da piscina',
 'Usar opção "filtrar" quando houver pouca sujeira. Para limpeza mais potente, selecionar "drenar". Não usar o cabo diretamente sem acessório na ponta (risco de danos no revestimento do fundo).',
 'checkbox', true),

(bloco3_id, 4, 'Limpeza das bordas',
 'Usar escovas de cerdas macias ou a parte macia de esponjas de cozinha. NÃO usar palha de aço ou esponjas ásperas. Usar produtos específicos para piscina ("limpa-bordas"). Nunca varrer sujeira do chão próximo para dentro da água.',
 'checkbox', true),

(bloco3_id, 5, 'Retrolavagem do filtro',
 'Duração: 5 minutos. Necessária para manter as boas qualidades do equipamento, removendo resíduos filtrados. A água vai para o esgoto. Após retrolavar: enxágue de 1 minuto para evitar que água suja volte à piscina.',
 'checkbox', true),

(bloco3_id, 6, 'Algicida',
 'Aplicar para eliminar algas. NÃO usar no mesmo dia da cloração.',
 'checkbox', true),

(bloco3_id, 7, 'Controle de alcalinidade',
 'Medir com fita de teste ou kit colorimétrico (deve ficar entre 80 e 120 ppm). Para corrigir: usar "elevador de alcalinidade" e "redutor de pH". Alcalinidade fora dos padrões danifica o equipamento e causa turbidez na água.',
 'checkbox', true);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 4 — Piscina: Tratamentos Mensais / Quando Necessário
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, tolerance_minutes)
VALUES (pop_id, 'Piscina — Supercloração e Clarificação (mensal/quando necessário)', 4, 30)
RETURNING id INTO bloco4_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco4_id, 1, 'Supercloração (1x por mês ou quando necessário)',
 'Necessária em períodos de muito uso (verão), após chuvas intensas, ou quando a água apresentar problemas. A piscina só deve voltar a ser usada quando o cloro livre voltar ao padrão (1 a 3 ppm). ATENÇÃO: nunca esvazie a piscina — pode comprometer a estrutura.',
 'checkbox', false),

(bloco4_id, 2, 'Clarificação e decantação (quando necessário)',
 'Realizar após controle de alcalinidade e pH. Quando a água continua turva: durante a filtragem, adicionar Clarificador (ou Cal Hidratado), que se combinará com as impurezas e se depositará no fundo. Em casos críticos, aspirar o fundo. Se não houver muita sujeira, a própria filtragem elimina as impurezas.',
 'checkbox', false);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 5 — Limpeza do Lago (1x por mês)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, tolerance_minutes)
VALUES (pop_id, 'Lago Ornamental — Limpeza Mensal (80.000 litros)', 5, 30)
RETURNING id INTO bloco5_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco5_id, 1, 'Preparação: desligar bombas e verificar EPIs',
 'Desligar bombas e todos os sistemas elétricos do lago. Garantir uso completo de EPIs: luvas, botas impermeáveis e óculos de proteção. Equipe recomendada: 2 profissionais treinados. Tempo médio: 90 a 120 minutos.',
 'checkbox', true),

(bloco5_id, 2, 'Manutenção das mantas acrílicas',
 'Remover as mantas do sistema de filtragem. Substituir de 30% a 50% das mantas conforme nível de saturação. Lavar as mantas reutilizadas EXCLUSIVAMENTE com água do próprio lago.',
 'checkbox', true),

(bloco5_id, 3, 'Limpeza estrutural',
 'Escovar suavemente bordas, pedras, cascatas e áreas decorativas. Remover algas visíveis SEM uso de produtos químicos.',
 'checkbox', true),

(bloco5_id, 4, 'Sifonagem e reposição de água',
 'Sifonar áreas pontuais do fundo, evitando remoção total do lodo (preserva o equilíbrio biológico). Repor água tratada mantendo o nível original do lago.',
 'checkbox', true),

(bloco5_id, 5, 'Testes e finalização',
 'Testar: pH (ideal 6,8–7,5), Amônia (0 ppm), Nitrito (0 ppm), Nitrato (< 40 ppm). Religar o sistema de filtragem. Verificar vazão e funcionamento correto das bombas.',
 'checkbox', true);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 6 — Limpeza de Calhas e Telhado (a cada 2 meses)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, tolerance_minutes)
VALUES (pop_id, 'Calhas, Telhado e Infiltrações (a cada 2 meses)', 6, 30)
RETURNING id INTO bloco6_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco6_id, 1, 'Preparação e EPIs obrigatórios',
 'Avaliar condições climáticas (NÃO executar em dias de chuva). Isolar a área abaixo da calha. Posicionar escada de forma segura. EPIs obrigatórios: luvas, capacete, óculos de proteção, botas de segurança, cinto de segurança tipo paraquedista.',
 'checkbox', true),

(bloco6_id, 2, 'Limpeza manual das calhas',
 'Remover folhas, galhos e detritos manualmente. Armazenar resíduos em recipiente apropriado. PROIBIDO: usar produtos químicos corrosivos ou trabalhar sem ancoragem adequada em altura.',
 'checkbox', true),

(bloco6_id, 3, 'Limpeza hidráulica',
 'Lavar a calha com mangueira de pressão controlada. Verificar fluxo contínuo da água até saída.',
 'checkbox', true),

(bloco6_id, 4, 'Inspeção final e registro',
 'Verificar fissuras, vazamentos e suportes. Registrar: data da limpeza, responsáveis, área atendida, condições encontradas e recomendações de manutenção. Descartar resíduos conforme normas locais (nunca em ralos ou áreas inadequadas).',
 'checkbox', true);

-- ══════════════════════════════════════════════════════════════════════════════
-- BLOCO 7 — Tratamento de Infiltrações (quando necessário)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO pop_blocks (pop_id, name, order_index, tolerance_minutes)
VALUES (pop_id, 'Infiltrações, Tratamento e Pintura (quando necessário)', 7, 60)
RETURNING id INTO bloco7_id;

INSERT INTO pop_steps (block_id, order_index, title, description, type, is_mandatory) VALUES
(bloco7_id, 1, 'Identificação e diagnóstico',
 'Identificar a origem da infiltração (calhas, lajes, tubulações, trincas). IMPORTANTE: corrigir a causa ANTES de iniciar a pintura.',
 'checkbox', true),

(bloco7_id, 2, 'Preparação do ambiente',
 'Isolar a área de trabalho. Garantir ventilação adequada. Utilizar todos os EPIs: luvas, máscara PFF2, óculos de proteção, botas de segurança, roupas de proteção.',
 'checkbox', true),

(bloco7_id, 3, 'Limpeza e tratamento com fungicida',
 'Raspar tinta solta e áreas comprometidas. Escovar e remover mofo e bolor. Aplicar solução fungicida ou água sanitária diluída (1:1). Aguardar 20 a 30 minutos. Deixar secar completamente antes de prosseguir.',
 'checkbox', true),

(bloco7_id, 4, 'Tratamento da superfície',
 'Aplicar selador acrílico ou fundo preparador. Corrigir imperfeições com massa corrida ou acrílica. Lixar (grãos médio e fino) e remover todo o pó.',
 'checkbox', true),

(bloco7_id, 5, 'Pintura com tinta antimofo',
 'Aplicar tinta acrílica antimofo. Realizar no mínimo DUAS demãos. PROIBIDO: pintar superfícies úmidas ou usar tinta sem tratamento antimofo.',
 'checkbox', true),

(bloco7_id, 6, 'Inspeção final e registro',
 'Verificar acabamento e aderência. Liberar o ambiente somente após secagem total. Registrar: data, área tratada, causa identificada, produtos utilizados, responsáveis e observações.',
 'checkbox', true);

RAISE NOTICE 'POP 003 — Manutenção inserido com sucesso! ID: %', pop_id;

END $$;

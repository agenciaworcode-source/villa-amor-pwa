-- ══════════════════════════════════════════════════════════════════════════════
-- VILLA AMOR — CASCADE DELETE em todas as foreign keys
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- executions → pops
ALTER TABLE executions
  DROP CONSTRAINT executions_pop_id_fkey;
ALTER TABLE executions
  ADD CONSTRAINT executions_pop_id_fkey
  FOREIGN KEY (pop_id) REFERENCES pops(id) ON DELETE CASCADE;

-- execution_steps → executions
ALTER TABLE execution_steps
  DROP CONSTRAINT execution_steps_execution_id_fkey;
ALTER TABLE execution_steps
  ADD CONSTRAINT execution_steps_execution_id_fkey
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE;

-- execution_steps → pop_steps
ALTER TABLE execution_steps
  DROP CONSTRAINT execution_steps_pop_step_id_fkey;
ALTER TABLE execution_steps
  ADD CONSTRAINT execution_steps_pop_step_id_fkey
  FOREIGN KEY (pop_step_id) REFERENCES pop_steps(id) ON DELETE CASCADE;

-- media_files → execution_steps
ALTER TABLE media_files
  DROP CONSTRAINT media_files_execution_step_id_fkey;
ALTER TABLE media_files
  ADD CONSTRAINT media_files_execution_step_id_fkey
  FOREIGN KEY (execution_step_id) REFERENCES execution_steps(id) ON DELETE CASCADE;

-- pop_blocks → pops
ALTER TABLE pop_blocks
  DROP CONSTRAINT pop_blocks_pop_id_fkey;
ALTER TABLE pop_blocks
  ADD CONSTRAINT pop_blocks_pop_id_fkey
  FOREIGN KEY (pop_id) REFERENCES pops(id) ON DELETE CASCADE;

-- pop_steps → pop_blocks
ALTER TABLE pop_steps
  DROP CONSTRAINT pop_steps_block_id_fkey;
ALTER TABLE pop_steps
  ADD CONSTRAINT pop_steps_block_id_fkey
  FOREIGN KEY (block_id) REFERENCES pop_blocks(id) ON DELETE CASCADE;

-- alerts → executions (SET NULL para preservar o histórico de alertas)
ALTER TABLE alerts
  DROP CONSTRAINT alerts_execution_id_fkey;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_execution_id_fkey
  FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE SET NULL;

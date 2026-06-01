-- Migration: Expansão do cadastro de residentes
-- Adds identity documents, legal responsible, and medical information fields
-- Run via: supabase db push  OR  execute directly on Supabase SQL editor

ALTER TABLE residents
  -- Dados pessoais complementares
  ADD COLUMN IF NOT EXISTS nationality       text,
  ADD COLUMN IF NOT EXISTS naturalness       text,

  -- Documentos de identidade
  ADD COLUMN IF NOT EXISTS cpf               text,
  ADD COLUMN IF NOT EXISTS rg                text,
  ADD COLUMN IF NOT EXISTS rg_issuer         text,
  ADD COLUMN IF NOT EXISTS rg_issue_date     date,

  -- Alojamento
  ADD COLUMN IF NOT EXISTS admission_date    date,
  ADD COLUMN IF NOT EXISTS contract_number   text,

  -- Responsável legal / contato de emergência
  ADD COLUMN IF NOT EXISTS responsible_name         text,
  ADD COLUMN IF NOT EXISTS responsible_relationship text,
  ADD COLUMN IF NOT EXISTS responsible_cpf          text,
  ADD COLUMN IF NOT EXISTS responsible_phone        text,
  ADD COLUMN IF NOT EXISTS responsible_email        text,
  ADD COLUMN IF NOT EXISTS responsible_address      text,

  -- Informações médicas
  ADD COLUMN IF NOT EXISTS doctor_name              text,
  ADD COLUMN IF NOT EXISTS doctor_crm               text,
  ADD COLUMN IF NOT EXISTS health_insurance         text,
  ADD COLUMN IF NOT EXISTS health_insurance_number  text,
  ADD COLUMN IF NOT EXISTS diagnoses                text,
  ADD COLUMN IF NOT EXISTS allergies                text,
  ADD COLUMN IF NOT EXISTS medications              text,

  -- Observações gerais
  ADD COLUMN IF NOT EXISTS notes                    text;

-- Unique constraint no CPF (opcional — remova se quiser permitir duplicatas temporárias)
-- ALTER TABLE residents ADD CONSTRAINT residents_cpf_unique UNIQUE (cpf);

COMMENT ON COLUMN residents.cpf                    IS 'CPF do residente (formato: 000.000.000-00)';
COMMENT ON COLUMN residents.rg                     IS 'Número do RG';
COMMENT ON COLUMN residents.rg_issuer              IS 'Órgão emissor do RG (ex: SSP/SP)';
COMMENT ON COLUMN residents.rg_issue_date          IS 'Data de emissão do RG';
COMMENT ON COLUMN residents.admission_date         IS 'Data de admissão na instituição';
COMMENT ON COLUMN residents.contract_number        IS 'Número do contrato de prestação de serviço';
COMMENT ON COLUMN residents.responsible_name       IS 'Nome completo do responsável legal';
COMMENT ON COLUMN residents.responsible_relationship IS 'Grau de parentesco com o residente';
COMMENT ON COLUMN residents.responsible_cpf        IS 'CPF do responsável legal';
COMMENT ON COLUMN residents.responsible_phone      IS 'Telefone/WhatsApp do responsável';
COMMENT ON COLUMN residents.responsible_email      IS 'E-mail do responsável';
COMMENT ON COLUMN residents.responsible_address    IS 'Endereço completo do responsável';
COMMENT ON COLUMN residents.doctor_name            IS 'Nome do médico responsável pelo residente';
COMMENT ON COLUMN residents.doctor_crm             IS 'CRM do médico responsável';
COMMENT ON COLUMN residents.health_insurance       IS 'Operadora do plano de saúde';
COMMENT ON COLUMN residents.health_insurance_number IS 'Número da carteirinha do plano de saúde';
COMMENT ON COLUMN residents.diagnoses              IS 'Diagnósticos e CIDs do residente';
COMMENT ON COLUMN residents.allergies              IS 'Alergias conhecidas';
COMMENT ON COLUMN residents.medications            IS 'Medicamentos em uso com dosagem e frequência';
COMMENT ON COLUMN residents.notes                  IS 'Observações gerais sobre o residente';

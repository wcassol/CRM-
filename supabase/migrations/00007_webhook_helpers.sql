-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00007
-- Auxiliares para o sistema de webhooks:
--   1. Função increment_webhook_tentativas (chamada pelo WebhookService.markFailed)
--   2. Coluna calcom_uid em appointments (vínculo com Cal.com)
--   3. Coluna participante_nome / participante_email em appointments
--   4. Coluna calcom_uid index
-- =============================================================================

-- 1. Incrementa tentativas e grava mensagem de erro no webhook_queue
CREATE OR REPLACE FUNCTION increment_webhook_tentativas(
  p_queue_id UUID,
  p_error    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tentativas INTEGER;
  v_max        INTEGER := 5;
BEGIN
  SELECT tentativas INTO v_tentativas
  FROM webhook_queue
  WHERE id = p_queue_id;

  UPDATE webhook_queue
  SET
    tentativas  = COALESCE(v_tentativas, 0) + 1,
    status      = CASE
                    WHEN COALESCE(v_tentativas, 0) + 1 >= v_max THEN 'falha'
                    ELSE 'pendente'   -- volta para reprocessar depois
                  END,
    erro_msg    = p_error,
    updated_at  = NOW()
  WHERE id = p_queue_id;
END;
$$;

COMMENT ON FUNCTION increment_webhook_tentativas IS
  'Incrementa tentativas de processamento do webhook e marca como falha após 5 tentativas.';

-- 2. Adicionar coluna erro_msg ao webhook_queue (se não existir)
ALTER TABLE webhook_queue
  ADD COLUMN IF NOT EXISTS erro_msg TEXT;

-- 3. Colunas de vínculo com Cal.com na tabela appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS calcom_uid         TEXT,
  ADD COLUMN IF NOT EXISTS participante_nome  TEXT,
  ADD COLUMN IF NOT EXISTS participante_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_calcom_uid
  ON appointments (calcom_uid)
  WHERE calcom_uid IS NOT NULL;

-- 4. Permitir lead_id nulo em appointments (para reuniões não vinculadas)
-- Nota: Se a coluna for NOT NULL na migration 00001, alterar aqui:
ALTER TABLE appointments
  ALTER COLUMN lead_id DROP NOT NULL;

-- 5. Adicionar updated_at ao webhook_queue
ALTER TABLE webhook_queue
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Conceder permissão de execução da função ao service_role
GRANT EXECUTE ON FUNCTION increment_webhook_tentativas TO service_role;

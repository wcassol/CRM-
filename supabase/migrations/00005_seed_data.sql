-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00005: DADOS INICIAIS (SEED)
-- =============================================================================
-- Dados necessários para o sistema funcionar desde o primeiro deploy:
--   - Roles com mapa de permissões
--   - Origens padrão de leads
--   - Motivos de perda padrão
--   - Requisitos de documentos por área
--   - Configurações de integrações (vazias)
--   - Itens padrão de onboarding
-- =============================================================================


-- ---------------------------------------------------------------------------
-- ROLES E PERMISSÕES
-- ---------------------------------------------------------------------------

INSERT INTO roles (name, display_name, permissions) VALUES

('admin', 'Administrador', '{
  "dashboard":    { "ver": true, "ver_todos": true },
  "leads":        { "ver": true, "criar": true, "editar": true, "deletar": true, "ver_todos": true },
  "triagem":      { "ver": true, "editar": true },
  "documentos":   { "ver": true, "validar": true, "upload": true },
  "reunioes":     { "ver": true, "criar": true, "editar": true },
  "propostas":    { "ver": true, "criar": true, "editar": true },
  "contratos":    { "ver": true, "criar": true, "editar": true },
  "cobracas":     { "ver": true, "criar": true, "editar": true },
  "onboarding":   { "ver": true, "editar": true, "enviar_astrea": true },
  "tarefas":      { "ver": true, "criar": true, "editar": true, "ver_todas": true },
  "relatorios":   { "ver": true },
  "usuarios":     { "ver": true, "criar": true, "editar": true, "deletar": true },
  "configuracoes":{ "ver": true, "editar": true },
  "audit_logs":   { "ver": true }
}'),

('comercial', 'Comercial', '{
  "dashboard":    { "ver": true, "ver_todos": false },
  "leads":        { "ver": true, "criar": true, "editar": true, "deletar": false, "ver_todos": false },
  "triagem":      { "ver": true, "editar": true },
  "documentos":   { "ver": true, "validar": false, "upload": true },
  "reunioes":     { "ver": true, "criar": true, "editar": true },
  "propostas":    { "ver": true, "criar": true, "editar": true },
  "contratos":    { "ver": true, "criar": true, "editar": false },
  "cobracas":     { "ver": true, "criar": false, "editar": false },
  "onboarding":   { "ver": false, "editar": false, "enviar_astrea": false },
  "tarefas":      { "ver": true, "criar": true, "editar": true, "ver_todas": false },
  "relatorios":   { "ver": false },
  "usuarios":     { "ver": false },
  "configuracoes":{ "ver": false },
  "audit_logs":   { "ver": false }
}'),

('pre_juridico', 'Pré-Jurídico / Análise', '{
  "dashboard":    { "ver": true, "ver_todos": false },
  "leads":        { "ver": true, "criar": false, "editar": false, "deletar": false, "ver_todos": false },
  "triagem":      { "ver": true, "editar": true },
  "documentos":   { "ver": true, "validar": true, "upload": false },
  "reunioes":     { "ver": true, "criar": false, "editar": false },
  "propostas":    { "ver": true, "criar": false, "editar": false },
  "contratos":    { "ver": false },
  "cobracas":     { "ver": false },
  "onboarding":   { "ver": false },
  "tarefas":      { "ver": true, "criar": true, "editar": true, "ver_todas": false },
  "relatorios":   { "ver": false },
  "usuarios":     { "ver": false },
  "configuracoes":{ "ver": false },
  "audit_logs":   { "ver": false }
}'),

('juridico', 'Jurídico', '{
  "dashboard":    { "ver": true, "ver_todos": false },
  "leads":        { "ver": true, "criar": false, "editar": false, "deletar": false, "ver_todos": false },
  "triagem":      { "ver": true, "editar": false },
  "documentos":   { "ver": true, "validar": false, "upload": false },
  "reunioes":     { "ver": true, "criar": false, "editar": false },
  "propostas":    { "ver": true, "criar": false, "editar": false },
  "contratos":    { "ver": true, "criar": false, "editar": false },
  "cobracas":     { "ver": false },
  "onboarding":   { "ver": true, "editar": true, "enviar_astrea": true },
  "tarefas":      { "ver": true, "criar": true, "editar": true, "ver_todas": false },
  "relatorios":   { "ver": false },
  "usuarios":     { "ver": false },
  "configuracoes":{ "ver": false },
  "audit_logs":   { "ver": false }
}'),

('financeiro', 'Financeiro', '{
  "dashboard":    { "ver": true, "ver_todos": true },
  "leads":        { "ver": true, "criar": false, "editar": false, "deletar": false, "ver_todos": false },
  "triagem":      { "ver": false },
  "documentos":   { "ver": false },
  "reunioes":     { "ver": false },
  "propostas":    { "ver": true, "criar": false, "editar": false },
  "contratos":    { "ver": true, "criar": false, "editar": false },
  "cobracas":     { "ver": true, "criar": true, "editar": true },
  "onboarding":   { "ver": false },
  "tarefas":      { "ver": true, "criar": true, "editar": true, "ver_todas": false },
  "relatorios":   { "ver": true },
  "usuarios":     { "ver": false },
  "configuracoes":{ "ver": false },
  "audit_logs":   { "ver": false }
}');


-- ---------------------------------------------------------------------------
-- ORIGENS DE LEADS
-- ---------------------------------------------------------------------------

INSERT INTO lead_sources (nome, canal) VALUES
  ('WhatsApp Direto',          'whatsapp'),
  ('Formulário Site',          'formulario'),
  ('Facebook Ads',             'anuncio'),
  ('Google Ads',               'anuncio'),
  ('Instagram Ads',            'anuncio'),
  ('Indicação de Cliente',     'indicacao'),
  ('Indicação de Parceiro',    'indicacao'),
  ('Landing Page Campanha',    'formulario'),
  ('Ligação Receptiva',        'telefone'),
  ('ZapConnecta / Chatbot',    'whatsapp'),
  ('Orgânico (SEO/Blog)',      'organico'),
  ('YouTube',                  'social'),
  ('LinkedIn',                 'social'),
  ('Evento / Webinar',         'evento'),
  ('Outros',                   'outros');


-- ---------------------------------------------------------------------------
-- MOTIVOS DE PERDA — Pipeline Comercial
-- ---------------------------------------------------------------------------

INSERT INTO loss_reasons (descricao, pipeline) VALUES
  ('Caso sem viabilidade jurídica',             'comercial'),
  ('Documentação insuficiente / inexistente',   'comercial'),
  ('Lead não respondeu após 3+ tentativas',     'comercial'),
  ('Lead não compareceu à reunião',             'comercial'),
  ('Preço / honorários acima do esperado',      'comercial'),
  ('Fechou contrato com concorrente',           'comercial'),
  ('Desistiu do processo',                      'comercial'),
  ('Problema financeiro do lead',               'comercial'),
  ('Caso resolvido por conta própria',          'comercial'),
  ('Fora da área de atuação do escritório',     'comercial'),
  ('Lead fantasma (dados inválidos)',            'comercial'),
  ('Prazo expirado / urgência não atendida',    'comercial');

-- Motivos de perda — Reativação
INSERT INTO loss_reasons (descricao, pipeline) VALUES
  ('Reativação futura programada',              'perdas'),
  ('Mudança de situação do lead',               'perdas'),
  ('Nova campanha de remarketing',              'perdas');


-- ---------------------------------------------------------------------------
-- REQUISITOS DE DOCUMENTOS POR ÁREA JURÍDICA
-- ---------------------------------------------------------------------------

-- Previdenciário
INSERT INTO document_requirements (nome, area_juridica, obrigatorio, instrucoes) VALUES
  ('CPF',                          'previdenciario', TRUE,  'Cópia simples ou foto nítida'),
  ('RG ou CNH',                    'previdenciario', TRUE,  'Documento com foto válido'),
  ('Comprovante de residência',    'previdenciario', TRUE,  'Emitido nos últimos 90 dias'),
  ('Carteira de trabalho (CTPS)', 'previdenciario', FALSE, 'Todas as páginas com vínculo'),
  ('Extrato CNIS',                 'previdenciario', TRUE,  'Solicitar no Meu INSS (gov.br)'),
  ('Laudos médicos',               'previdenciario', FALSE, 'Se caso de benefício por incapacidade'),
  ('Histórico de benefícios INSS', 'previdenciario', FALSE, 'Extrato de pagamentos');

-- Trabalhista
INSERT INTO document_requirements (nome, area_juridica, obrigatorio, instrucoes) VALUES
  ('CPF',                          'trabalhista', TRUE,  'Cópia simples'),
  ('RG ou CNH',                    'trabalhista', TRUE,  'Documento com foto'),
  ('CTPS (Carteira de Trabalho)', 'trabalhista', TRUE,  'Todas as páginas preenchidas'),
  ('Comprovante de residência',    'trabalhista', TRUE,  'Emitido nos últimos 90 dias'),
  ('Contrato de trabalho',         'trabalhista', FALSE, 'Se disponível'),
  ('Holerites / contracheques',    'trabalhista', TRUE,  'Últimos 3 meses ou do período reclamado'),
  ('Termo de rescisão (TRCT)',     'trabalhista', FALSE, 'Se já demitido'),
  ('Extrato FGTS',                 'trabalhista', FALSE, 'Pelo app FGTS');

-- Consumidor
INSERT INTO document_requirements (nome, area_juridica, obrigatorio, instrucoes) VALUES
  ('CPF',                          'consumidor', TRUE,  'Cópia simples'),
  ('RG ou CNH',                    'consumidor', TRUE,  'Documento com foto'),
  ('Comprovante de residência',    'consumidor', TRUE,  'Emitido nos últimos 90 dias'),
  ('Contrato / nota fiscal',       'consumidor', TRUE,  'Documento relacionado ao problema'),
  ('Comprovantes de pagamento',    'consumidor', FALSE, 'Se houver cobranças indevidas'),
  ('Print de conversas / e-mails', 'consumidor', FALSE, 'Evidências da relação com empresa'),
  ('Boletim de ocorrência',        'consumidor', FALSE, 'Se aplicável');

-- Cível / Família
INSERT INTO document_requirements (nome, area_juridica, obrigatorio, instrucoes) VALUES
  ('CPF',                          'civel', TRUE,  'Cópia simples'),
  ('RG ou CNH',                    'civel', TRUE,  'Documento com foto'),
  ('Comprovante de residência',    'civel', TRUE,  'Emitido nos últimos 90 dias'),
  ('Certidão de casamento/união', 'civel', FALSE, 'Se caso de família'),
  ('Certidão de nascimento',       'civel', FALSE, 'Filhos envolvidos'),
  ('Documentos do imóvel',         'civel', FALSE, 'Se caso envolver imóvel');


-- ---------------------------------------------------------------------------
-- INTEGRAÇÕES (configuração inicial vazia, admin configura no painel)
-- ---------------------------------------------------------------------------

INSERT INTO integrations (nome, display_name, config, ativo) VALUES
  ('zapsign',    'ZapSign',        '{"api_token": "", "webhook_secret": ""}',         FALSE),
  ('asaas',      'Asaas',          '{"api_key": "", "environment": "sandbox", "webhook_token": ""}', FALSE),
  ('calcom',     'Cal.com',        '{"api_key": "", "webhook_secret": ""}',            FALSE),
  ('n8n',        'n8n',            '{"base_url": "", "api_key": ""}',                  FALSE),
  ('astrea',     'Astrea',         '{"api_url": "", "api_token": ""}',                 FALSE),
  ('zapconnecta','ZapConnecta',    '{"webhook_url": ""}',                              FALSE);


-- ---------------------------------------------------------------------------
-- CAMPOS PERSONALIZADOS DE EXEMPLO
-- ---------------------------------------------------------------------------

INSERT INTO custom_field_definitions (entidade, nome, label, tipo, obrigatorio, area_juridica, ordem) VALUES
  ('lead', 'numero_beneficio_inss',  'Número do Benefício INSS',  'text',    FALSE, 'previdenciario', 1),
  ('lead', 'dib_data',               'Data DIB',                  'date',    FALSE, 'previdenciario', 2),
  ('lead', 'tipo_beneficio',         'Tipo de Benefício Pleiteado','select',  FALSE, 'previdenciario', 3),
  ('lead', 'numero_processo_antigo', 'Número do Processo Anterior','text',    FALSE, 'previdenciario', 4),
  ('lead', 'data_demissao',          'Data da Demissão',          'date',    FALSE, 'trabalhista',    1),
  ('lead', 'motivo_demissao',        'Motivo da Demissão',        'select',  FALSE, 'trabalhista',    2),
  ('lead', 'numero_processo_audi',   'Número do Processo (Audiência)','text', FALSE, 'trabalhista',    3);

-- Opções para campos tipo select
UPDATE custom_field_definitions
SET opcoes = '["Aposentadoria por Tempo de Contribuição", "Aposentadoria por Invalidez", "Auxílio-Doença", "BPC/LOAS", "Pensão por Morte", "Auxílio-Acidente", "Salário-Maternidade"]'
WHERE nome = 'tipo_beneficio';

UPDATE custom_field_definitions
SET opcoes = '["Justa causa", "Sem justa causa", "Pedido de demissão", "Rescisão indireta", "Acordo mútuo", "Término de contrato"]'
WHERE nome = 'motivo_demissao';

# NEXO — Prospecção inteligente

Primeiro marco funcional, v0.1. Interface responsiva em português do Brasil, sem dependências de execução e sem APIs pagas.

## Funcionalidades

- Perfil profissional: nome, título, cidade, especialidades, descrição, limites e portfólio.
- Serviços: criar, editar, ativar, desativar, excluir, pesquisar e filtrar.
- Sugestões locais por especialidade, sempre revisadas antes de salvar; não usam IA.
- Pesquisa: configuração de nicho, UF, cidade/RA, bairro e quantidade; salva somente rascunhos.
- Configurações: exportação e restauração de backup JSON validado.
- Persistência no localStorage do navegador. Sem sincronização entre dispositivos.

## Executar

Servir `dist/` por qualquer servidor HTTP estático. Não requer npm ou build. O código pode ser hospedado em Cloudflare Pages, com diretório de publicação `dist` e sem comando de build. `.openai/hosting.json` mantém a identidade da prévia privada no ChatGPT Sites.

## Próxima etapa

1. Login e banco de dados Supabase com RLS.
2. Função no servidor para Gemini, com segredo fora do navegador e cotas gratuitas verificadas.
3. Busca real, fontes, validação de contatos e deduplicação.
4. Diagnóstico, seleção de serviço e plano comercial conforme o método Arquiteto de Prospecção.

Nenhuma busca real, análise com IA, envio de mensagens, agendamento automático ou integração de CRM é executada nesta versão. Os módulos futuros mostram estados vazios sem empresas ou resultados fictícios.

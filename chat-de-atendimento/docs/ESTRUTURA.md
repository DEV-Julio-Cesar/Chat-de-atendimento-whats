# Estrutura do Projeto

Este documento resume a organização das pastas e arquivos para facilitar leitura, manutenção e evolução do sistema.

## Visão Geral

- `main.js` / `src/principal/aplicativo-principal.js`: Processo principal do Electron.
- `src/`: Código-fonte do app.
  - `aplicacao/`: Regras de negócio e serviços (users, métricas, relatórios, etc.).
  - `autenticacao/`: Implementação alternativa/legada de gestão de usuários baseada em outro storage.
  - `infraestrutura/`: Infra (API Express, logger, integrações utilitárias).
  - `interfaces/`: UI (HTML/JS) e preloads.
  - `whatsapp/`: Camada de integração com WhatsApp (websocket/servidor interno).
  - `principal/`: Inicialização do app (Electron) e bootstrap.
- `dados/`: Arquivos de dados persistidos em JSON.
- `config/`: Configurações principais do aplicativo.
- `scripts/`: Scripts utilitários (ex.: seed de usuários).
- `tests/`: Testes manuais/de verificação.
- `docs/`: Documentação de arquitetura e guia de contribuição.

## Dados de Usuários

Há dois arquivos históricos de usuários:

- `dados/usuarios.json` (canônico):
  - Usado por `src/aplicacao/validacao-credenciais.js` e `src/aplicacao/gerenciador-usuarios.js`.
  - Senhas devem estar com hash SHA-256 (compatível com `validacao-credenciais.js`).
  
Arquivos legados e removidos:
- Módulos em `src/autenticacao/` foram descontinuados. Utilize apenas os módulos em `src/aplicacao/`.
- Servidores WebSocket legados (`websocket_server.js`, `internal-chat-server.js`) foram mantidos como proxies para as versões canônicas (`servidor-websocket.js`, `servidor-chat-interno.js`).

Para garantir testes e evitar inconsistências, use o script de seed abaixo.

## Scripts Úteis

- `npm run seed:admin` – Garante o usuário `admin` (senha `admin`) em `dados/usuarios.json` e remove arquivos legados de usuários.
- `npm run ws` – Inicia o servidor WebSocket principal (`servidor-websocket.js`).
- `npm run chat:interno` – Inicia o servidor de chat interno (`servidor-chat-interno.js`).
- `npm run verificar` – Verifica estrutura básica do projeto.
- `npm run teste` – Executa verificação completa (infra/dados/arquivos).

## Padrões e Recomendações

- Preferir `dados/usuarios.json` como fonte canônica de autenticação.
- Senhas: manter SHA-256 (compatível com o módulo atual de validação). Opcionalmente integrar `bcrypt` no fluxo completo em uma futura unificação.
- Logs: usar o `src/infraestrutura/logger.js`.
- Organização de módulos: agrupar por domínio (ex.: usuários, métricas, notificações) dentro de `src/aplicacao/`.

## Próximos Passos (Sugeridos)

- Unificar os gerenciadores de usuários em um único módulo e um único arquivo de dados.
- Adicionar testes automatizados para login/cadastro.
- Introduzir variáveis de ambiente para chaves/senhas sensíveis.

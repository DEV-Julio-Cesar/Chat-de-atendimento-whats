# Comandos Úteis

Este guia reúne os comandos mais usados no projeto para facilitar o seu dia a dia.

## Primeiros Passos

```powershell
# Popular usuário de teste (admin/admin)
npm run seed:admin

# Iniciar o aplicativo
npm start
```

## Servidores (opcionais)

```powershell
# Servidor WebSocket principal (simulador de mensagens)
npm run ws

# Servidor de chat interno (comunicação entre atendentes)
npm run chat:interno
```

## Testes Rápidos

```powershell
# Teste de login
npm run teste:login

# Teste de cadastro
npm run teste:cadastro
```

## Diagnóstico e Verificações

```powershell
# Verificação completa do projeto
npm run teste

# Verificar estrutura básica
npm run verificar

# Limpar logs
npm run clean
```

Para entender a organização das pastas e responsabilidades, veja também `docs/ESTRUTURA.md`.

// Exibe os comandos principais para uso rápido do projeto
const lines = [
  '',
  '=== Chat de Atendimento WhatsApp — Comandos Rápidos ===',
  '',
  '1) Popular usuário de teste (admin/admin):',
  '   npm run seed:admin',
  '',
  '2) Iniciar servidores (opcional, em terminais separados):',
  '   npm run ws',
  '   npm run chat:interno',
  '',
  '3) Iniciar o aplicativo Electron:',
  '   npm start',
  '',
  '4) Testes rápidos:',
  '   npm run teste:login',
  '   npm run teste:cadastro',
    '5) Verificar correções do WhatsApp:',
    '   npm run verificar:whatsapp',
    '',
  '',
  'Dica: Veja docs/COMANDOS.md e docs/ESTRUTURA.md para mais detalhes.',
    '      docs/TESTE-WHATSAPP.md - Guia de teste da integração WhatsApp',
  ''
];

console.log(lines.join('\n'));

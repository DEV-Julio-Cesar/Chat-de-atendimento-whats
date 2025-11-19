// websocket_server.js
// Este servidor simula o recebimento de mensagens do WhatsApp e as envia
// para o seu aplicativo Electron (que é o cliente WebSocket).

const WebSocket = require('ws');
const port = 8080;
const wss = new WebSocket.Server({ port });

console.log(`\nServidor WebSocket iniciado na porta ${port}`);
console.log('Aguardando a conexão do cliente Electron...');

// Array de mensagens simuladas para envio
const simulatedMessages = [
    { 
        texto: "Oi, vi seu produto no site. Está disponível?", 
        name: "Cláudio Silva", 
        number: "5511980010001" 
    },
    { 
        texto: "Olá! Preciso de ajuda com meu pedido #4582.", 
        name: "Maria Souza", 
        number: "5521980020002" 
    },
    { 
        texto: "Quanto custa o frete para Belo Horizonte?", 
        name: "Lucas Pimenta", 
        number: "5531980030003" 
    },
];

wss.on('connection', function connection(ws) {
    console.log('\n[Conexão Estabelecida] Cliente Electron conectado!');
    
    let messageIndex = 0;

    // Função para enviar uma mensagem simulada
    const sendSimulatedMessage = () => {
        if (ws.readyState === WebSocket.OPEN && messageIndex < simulatedMessages.length) {
            const message = simulatedMessages[messageIndex];
            
            console.log(`[ENVIANDO] Mensagem para ${message.name} (${message.number})`);
            
            // O payload é enviado como JSON para o Electron
            ws.send(JSON.stringify(message));
            
            messageIndex++;
            
            // Agenda a próxima mensagem após 3 segundos
            setTimeout(sendSimulatedMessage, 3000);
        } else if (messageIndex >= simulatedMessages.length) {
            console.log('[SIMULAÇÃO COMPLETA] Todas as mensagens simuladas foram enviadas.');
        }
    };

    // Começa a enviar mensagens 2 segundos após a conexão
    setTimeout(sendSimulatedMessage, 2000);

    // Evento de fechamento de conexão
    ws.on('close', () => {
        console.log('[Conexão Encerrada] Cliente desconectou.');
    });
});

wss.on('error', (error) => {
    console.error('Erro no servidor WebSocket:', error.message);
});

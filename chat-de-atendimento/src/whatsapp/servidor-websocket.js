/**
 * =========================================================================
 * SERVIDOR WEBSOCKET - SIMULAÇÃO DE MENSAGENS WHATSAPP
 * =========================================================================
 * 
 * Este servidor simula o recebimento de mensagens do WhatsApp e as envia
 * para o aplicativo Electron através de WebSocket.
 * 
 * Funcionalidades:
 * - Simula mensagens de clientes
 * - Envia mensagens em intervalos regulares
 * - Conecta automaticamente com o aplicativo Electron
 * - Suporte a múltiplos clientes simultâneos
 * 
 * @author Sistema Chat Atendimento
 * @version 2.0.0
 * @since 2024
 */

const WebSocket = require('ws');
const { roteamentoAutomatizado } = require('../aplicacao/gerenciador-mensagens');

// =========================================================================
// CONFIGURAÇÕES DO SERVIDOR
// =========================================================================

const PORTA_SERVIDOR = 8080;
const INTERVALO_MENSAGENS = 3000; // 3 segundos entre mensagens

// =========================================================================
// MENSAGENS SIMULADAS
// =========================================================================

/**
 * Array de mensagens simuladas para demonstração
 * Em produção, estas seriam recebidas da API real do WhatsApp
 */
const mensagensSimuladas = [
    { 
        texto: "Oi, vi seu produto no site. Está disponível?", 
        nome: "Cláudio Silva", 
        numero: "5511980010001",
        tipo: "consulta"
    },
    { 
        texto: "Olá! Preciso de ajuda com meu pedido #4582.", 
        nome: "Maria Souza", 
        numero: "5521980020002",
        tipo: "suporte"
    },
    { 
        texto: "Quanto custa o frete para Belo Horizonte?", 
        nome: "Lucas Pimenta", 
        numero: "5531980030003",
        tipo: "consulta"
    },
    {
        texto: "Bom dia! Gostaria de saber mais sobre os produtos em promoção.",
        nome: "Ana Carolina",
        numero: "5541980040004",
        tipo: "comercial"
    },
    {
        texto: "Oi! Meu pedido ainda não chegou. Pode verificar o status?",
        nome: "Roberto Santos",
        numero: "5551980050005", 
        tipo: "suporte"
    },
    {
        texto: "Vocês fazem entrega no interior de São Paulo?",
        nome: "Fernanda Lima",
        numero: "5511980060006",
        tipo: "logistica"
    },
    {
        texto: "Preciso cancelar meu pedido. Como posso fazer?",
        nome: "Carlos Eduardo",
        numero: "5521980070007",
        tipo: "cancelamento"
    }
];

// =========================================================================
// CRIAÇÃO E CONFIGURAÇÃO DO SERVIDOR
// =========================================================================

const servidorWebSocket = new WebSocket.Server({ port: PORTA_SERVIDOR });

console.log('🚀 =======================================================');
console.log('📡 SERVIDOR WEBSOCKET - CHAT WHATSAPP');
console.log('🚀 =======================================================');
console.log(`📍 Servidor iniciado na porta: ${PORTA_SERVIDOR}`);
console.log(`🔗 URL de conexão: ws://localhost:${PORTA_SERVIDOR}`);
console.log('⏳ Aguardando conexão do aplicativo Electron...');
console.log('🚀 =======================================================\n');

// =========================================================================
// GERENCIAMENTO DE CONEXÕES
// =========================================================================

/**
 * Gerencia novas conexões WebSocket
 */
servidorWebSocket.on('connection', function connection(websocket, request) {
    console.log('🎯 [NOVA CONEXÃO] Cliente Electron conectado!');
    console.log(`📊 IP do cliente: ${request.socket.remoteAddress}`);
    console.log(`🕒 Horário: ${new Date().toLocaleString('pt-BR')}\n`);
    
    let indiceMensagem = 0;
    let intervalEnvioMensagens = null;

    /**
     * Função para enviar uma mensagem simulada
     */
    const enviarMensagemSimulada = () => {
        // Verifica se a conexão ainda está ativa e se há mensagens para enviar
        if (websocket.readyState === WebSocket.OPEN && indiceMensagem < mensagensSimuladas.length) {
            const mensagem = mensagensSimuladas[indiceMensagem];
            
            // Adiciona dados extras para simular uma mensagem real
            const payloadCompleto = {
                ...mensagem,
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                dataRecebimento: new Date().toISOString(),
                lida: false,
                respondida: false
            };
            
            console.log(`📤 [ENVIANDO MENSAGEM ${indiceMensagem + 1}/${mensagensSimuladas.length}]`);
            console.log(`👤 De: ${mensagem.nome} (${mensagem.numero})`);
            console.log(`💬 Texto: "${mensagem.texto}"`);
            console.log(`🏷️ Tipo: ${mensagem.tipo}`);
            console.log(`🔗 ID: ${payloadCompleto.id}`);
            
            // Envia o payload como JSON para o Electron
            websocket.send(JSON.stringify(payloadCompleto));

            // Integração chatbot (roteamento automatizado provedor)
            ;(async () => {
                try {
                    const resultado = await roteamentoAutomatizado('simulador', mensagem.numero, mensagem.texto);
                    if (resultado.devResponder && websocket.readyState === WebSocket.OPEN) {
                        const respostaPayload = {
                            tipo: 'chatbot',
                            id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            originalId: payloadCompleto.id,
                            numero: mensagem.numero,
                            texto: resultado.resposta,
                            intent: resultado.metadata?.intent || null,
                            intentTipo: resultado.metadata?.tipo || null,
                            escalar: resultado.escalar || false,
                            timestamp: Date.now(),
                            dataEnvio: new Date().toISOString()
                        };
                        // Delay pequeno para simular processamento
                        setTimeout(() => {
                            if (websocket.readyState === WebSocket.OPEN) {
                                websocket.send(JSON.stringify(respostaPayload));
                                console.log('🤖 [CHATBOT RESPOSTA]', respostaPayload.texto);
                                if (respostaPayload.escalar) {
                                    console.log('⬆️ [ESCALONAMENTO] Encaminhar para atendimento humano.');
                                }
                            }
                        }, 400);
                    }
                } catch (e) {
                    console.log('⚠️ [CHATBOT ERRO]', e.message);
                }
            })();
            
            indiceMensagem++;
            
            // Agenda a próxima mensagem
            intervalEnvioMensagens = setTimeout(enviarMensagemSimulada, INTERVALO_MENSAGENS);
            
        } else if (indiceMensagem >= mensagensSimuladas.length) {
            console.log('✅ [SIMULAÇÃO COMPLETA] Todas as mensagens simuladas foram enviadas.');
            console.log('🔄 Para receber novas mensagens, reinicie o servidor.\n');
            
            // Para de enviar mensagens
            clearTimeout(intervalEnvioMensagens);
        }
    };

    /**
     * Inicia o envio de mensagens após 2 segundos
     */
    setTimeout(() => {
        console.log('🏁 [INICIANDO SIMULAÇÃO] Começando envio de mensagens...\n');
        enviarMensagemSimulada();
    }, 2000);

    /**
     * Processa mensagens recebidas do cliente (se houver)
     */
    websocket.on('message', function incoming(data) {
        try {
            const mensagemRecebida = JSON.parse(data);
            console.log('📥 [MENSAGEM RECEBIDA DO CLIENTE]:', mensagemRecebida);
        } catch (erro) {
            console.log('📥 [DADOS RECEBIDOS]:', data.toString());
        }
    });

    /**
     * Gerencia desconexão do cliente
     */
    websocket.on('close', function close() {
        console.log('❌ [DESCONEXÃO] Cliente Electron desconectado');
        console.log(`🕒 Horário: ${new Date().toLocaleString('pt-BR')}`);
        
        // Limpa os intervalos se existirem
        if (intervalEnvioMensagens) {
            clearTimeout(intervalEnvioMensagens);
        }
        
        console.log('⏳ Aguardando nova conexão...\n');
    });

    /**
     * Gerencia erros na conexão
     */
    websocket.on('error', function error(erro) {
        console.error('⚠️ [ERRO DE CONEXÃO]:', erro.message);
        
        // Limpa os intervalos se existirem
        if (intervalEnvioMensagens) {
            clearTimeout(intervalEnvioMensagens);
        }
    });

    /**
     * Envia mensagem de boas-vindas
     */
    const mensagemBoasVindas = {
        tipo: 'sistema',
        texto: 'Servidor WebSocket conectado com sucesso!',
        timestamp: Date.now(),
        servidor: 'Chat WhatsApp Simulator'
    };

    websocket.send(JSON.stringify(mensagemBoasVindas));
});

// =========================================================================
// GERENCIAMENTO DE ERROS DO SERVIDOR
// =========================================================================

/**
 * Gerencia erros do servidor
 */
servidorWebSocket.on('error', function serverError(erro) {
    console.error('💥 [ERRO DO SERVIDOR]:', erro);
});

/**
 * Gerencia o fechamento do servidor
 */
process.on('SIGINT', () => {
    console.log('\n🛑 [ENCERRANDO SERVIDOR]');
    console.log('📊 Fechando todas as conexões...');
    
    servidorWebSocket.clients.forEach(function each(websocket) {
        websocket.terminate();
    });
    
    servidorWebSocket.close(() => {
        console.log('✅ Servidor WebSocket encerrado com sucesso!');
        process.exit(0);
    });
});

// =========================================================================
// INFORMAÇÕES ÚTEIS
// =========================================================================

console.log('📋 INFORMAÇÕES DO SERVIDOR:');
console.log(`📡 Porta: ${PORTA_SERVIDOR}`);
console.log(`⏱️ Intervalo entre mensagens: ${INTERVALO_MENSAGENS}ms`);
console.log(`📨 Total de mensagens simuladas: ${mensagensSimuladas.length}`);
console.log(`🔄 Reconexão automática: Suportada`);
console.log('📝 Para parar o servidor: Ctrl+C\n');

// =========================================================================
// EXPORTAÇÃO (SE USADO COMO MÓDULO)
// =========================================================================

module.exports = {
    servidorWebSocket,
    mensagensSimuladas,
    PORTA_SERVIDOR
};

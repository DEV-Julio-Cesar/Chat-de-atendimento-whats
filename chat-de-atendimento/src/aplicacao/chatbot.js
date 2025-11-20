const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const RULES_FILE = path.join(__dirname, '../../dados/chatbot-rules.json');

// Regras padrão
const DEFAULT_RULES = {
    ativo: true,
    horarioAtendimento: {
        inicio: '08:00',
        fim: '18:00',
        diasSemana: [1, 2, 3, 4, 5] // Segunda a Sexta
    },
    mensagemBoasVindas: 'Olá! Bem-vindo ao nosso atendimento. Como posso ajudar?',
    mensagemForaHorario: 'No momento estamos fora do horário de atendimento. Retornaremos em breve!',
    palavrasChave: [
        {
            palavras: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'],
            resposta: 'Olá! Como posso ajudá-lo hoje?'
        },
        {
            palavras: ['preço', 'preco', 'valor', 'quanto custa'],
            resposta: 'Para informações sobre preços, por favor aguarde que um atendente irá lhe responder em breve.'
        },
        {
            palavras: ['horário', 'horario', 'funcionamento', 'atendimento'],
            resposta: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.'
        },
        {
            palavras: ['obrigado', 'obrigada', 'valeu', 'agradeco'],
            resposta: 'Por nada! Estamos à disposição! 😊'
        }
    ],
    respostasPadrao: {
        primeiroContato: 'Olá! Seja bem-vindo(a)! Em que posso ajudá-lo(a)?',
        naoEntendi: 'Desculpe, não entendi sua mensagem. Um atendente irá respondê-lo em breve.'
    }
};

async function garantirArquivoRegras() {
    try {
        await fs.ensureFile(RULES_FILE);
        const conteudo = await fs.readFile(RULES_FILE, 'utf-8');
        
        if (!conteudo.trim()) {
            await fs.writeJson(RULES_FILE, DEFAULT_RULES, { spaces: 2 });
            logger.info('[Chatbot] Arquivo de regras criado');
        }
    } catch (erro) {
        await fs.writeJson(RULES_FILE, DEFAULT_RULES, { spaces: 2 });
        logger.info('[Chatbot] Arquivo de regras inicializado');
    }
}

async function carregarRegras() {
    try {
        await garantirArquivoRegras();
        return await fs.readJson(RULES_FILE);
    } catch (erro) {
        logger.erro('[Chatbot] Erro ao carregar regras:', erro.message);
        return DEFAULT_RULES;
    }
}

async function salvarRegras(novasRegras) {
    try {
        await fs.writeJson(RULES_FILE, novasRegras, { spaces: 2 });
        logger.info('[Chatbot] Regras atualizadas');
        return { success: true };
    } catch (erro) {
        logger.erro('[Chatbot] Erro ao salvar regras:', erro.message);
        return { success: false, message: erro.message };
    }
}

function estaEmHorarioAtendimento(regras) {
    if (!regras.ativo) return false;
    
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = Domingo, 6 = Sábado
    const horaAtual = agora.getHours() * 100 + agora.getMinutes(); // Ex: 14:30 = 1430
    
    if (!regras.horarioAtendimento.diasSemana.includes(diaSemana)) {
        return false;
    }
    
    const [horaInicio, minInicio] = regras.horarioAtendimento.inicio.split(':').map(Number);
    const [horaFim, minFim] = regras.horarioAtendimento.fim.split(':').map(Number);
    
    const horarioInicio = horaInicio * 100 + minInicio;
    const horarioFim = horaFim * 100 + minFim;
    
    return horaAtual >= horarioInicio && horaAtual <= horarioFim;
}

async function processarMensagem(mensagem, chatId, clientId) {
    try {
        const regras = await carregarRegras();
        
        if (!regras.ativo) {
            return { devResponder: false };
        }
        
        // Verifica horário de atendimento
        if (!estaEmHorarioAtendimento(regras)) {
            return {
                devResponder: true,
                resposta: regras.mensagemForaHorario
            };
        }
        
        const textoLower = mensagem.toLowerCase().trim();
        
        // Busca por palavras-chave
        for (const regra of regras.palavrasChave) {
            for (const palavra of regra.palavras) {
                if (textoLower.includes(palavra.toLowerCase())) {
                    return {
                        devResponder: true,
                        resposta: regra.resposta
                    };
                }
            }
        }
        
        // Resposta padrão se não encontrou palavra-chave
        return {
            devResponder: false // Deixa para atendente humano
        };
        
    } catch (erro) {
        logger.erro('[Chatbot] Erro ao processar mensagem:', erro.message);
        return { devResponder: false };
    }
}

module.exports = {
    carregarRegras,
    salvarRegras,
    processarMensagem,
    estaEmHorarioAtendimento
};
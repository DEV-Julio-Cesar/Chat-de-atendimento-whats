const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const RULES_FILE = path.join(__dirname, '../../dados/chatbot-rules.json');
const ISP_CONFIG_FILE = path.join(__dirname, '../../dados/provedor-config.json');
const ISP_METRICS_FILE = path.join(__dirname, '../../dados/provedor-metrics.json');

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

// ---------------------- Config Provedor Internet ----------------------
const DEFAULT_ISP_CONFIG = {
    ativo: true,
    limiteTentativasDiagnostico: 3,
    intents: [],
    mensagens: {
        nao_entendi: 'Não consegui identificar o tema. Encaminhando para um atendente.',
        diagnostico_continuar: 'Deseja continuar com o próximo passo do diagnóstico? (sim/não)',
        escalando: 'Encaminhando para atendimento humano...'
    }
};

async function garantirConfigProvedor() {
    try {
        await fs.ensureFile(ISP_CONFIG_FILE);
        const conteudo = await fs.readFile(ISP_CONFIG_FILE, 'utf-8');
        if (!conteudo.trim()) {
            await fs.writeJson(ISP_CONFIG_FILE, DEFAULT_ISP_CONFIG, { spaces: 2 });
            logger.info('[Chatbot] Config provedor criada com default');
        }
    } catch (erro) {
        await fs.writeJson(ISP_CONFIG_FILE, DEFAULT_ISP_CONFIG, { spaces: 2 });
        logger.info('[Chatbot] Config provedor inicializada com default');
    }
}

async function carregarConfigProvedor() {
    try {
        await garantirConfigProvedor();
        return await fs.readJson(ISP_CONFIG_FILE);
    } catch (erro) {
        logger.erro('[Chatbot] Erro ao carregar config provedor:', erro.message);
        return DEFAULT_ISP_CONFIG;
    }
}

async function registrarMetricaIntent(nomeIntent) {
    try {
        await fs.ensureFile(ISP_METRICS_FILE);
        let metrics = {};
        try {
            metrics = await fs.readJson(ISP_METRICS_FILE);
        } catch { metrics = {}; }
        metrics[nomeIntent] = (metrics[nomeIntent] || 0) + 1;
        await fs.writeJson(ISP_METRICS_FILE, metrics, { spaces: 2 });
    } catch (erro) {
        logger.erro('[Chatbot] Falha ao registrar métrica intent:', erro.message);
    }
}

function detectarIntentProvedor(textoLower, config) {
    if (!config.ativo || !config.intents || !Array.isArray(config.intents)) return null;
    for (const intent of config.intents) {
        for (const palavra of intent.palavras) {
            if (textoLower.includes(palavra.toLowerCase())) {
                return intent;
            }
        }
    }
    return null;
}

function montarRespostaIntent(intent) {
    if (intent.tipo === 'diagnostico' && Array.isArray(intent.passosDiagnostico)) {
        const passos = intent.passosDiagnostico.map((p, i) => `${i + 1}) ${p}`).join('\n');
        return `${intent.resposta}\n\nPassos:\n${passos}`;
    }
    return intent.resposta;
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

        // Primeiro: detectar intents específicas de provedor
        const configProvedor = await carregarConfigProvedor();
        const intent = detectarIntentProvedor(textoLower, configProvedor);
        if (intent) {
            if (intent.registrarMetricas) {
                registrarMetricaIntent(intent.nome);
            }
            const respostaIntent = montarRespostaIntent(intent);
            // Se necessidade de escalonamento imediato
            if (intent.escalarSempre) {
                return { devResponder: true, resposta: respostaIntent + '\n\n' + configProvedor.mensagens.escalando, escalar: true };
            }
            return { devResponder: true, resposta: respostaIntent, tipoIntent: intent.tipo, intent: intent.nome };
        }
        
        // Busca por palavras-chave (regras gerais)
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
        // Se nenhuma intent ou palavra-chave geral, encaminhar para humano
        return {
            devResponder: false
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
    estaEmHorarioAtendimento,
    carregarConfigProvedor
};
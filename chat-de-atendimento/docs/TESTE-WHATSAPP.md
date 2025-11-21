# 🧪 Guia de Teste - Integração WhatsApp

## ✅ Status das Correções Aplicadas

### 🔧 Problemas Identificados e Corrigidos:

1. **✅ API Preload Mismatch**
   - **Problema**: `preload-qr.js` expunha `electronAPI` mas `qr-window.html` esperava `qrAPI`
   - **Solução**: Alterado para `qrAPI` no preload

2. **✅ Formato QR Code**
   - **Problema**: QR enviado como texto simples, não como imagem DataURL
   - **Solução**: Adicionado `qrcode.toDataURL()` no handler `qr` do main.js

3. **✅ Handler de Inicialização**
   - **Problema**: Faltava handler IPC `start-whatsapp-connection`
   - **Solução**: Criado handler que chama `inicializarClienteWhatsApp(clientId)`

4. **✅ Evento Ready**
   - **Problema**: Janela QR não recebia notificação quando WhatsApp estava pronto
   - **Solução**: Adicionado `qrWindow.webContents.send('whatsapp-ready')` no evento `ready`

---

## 📋 Passo a Passo para Testar

### 1️⃣ **Pré-requisitos**
```bash
# Certifique-se que os servidores estão rodando:
npm run ws              # Servidor WebSocket (porta 8080)
npm run chat:interno    # Chat interno (porta 9090)
```

### 2️⃣ **Iniciar Aplicação**
```bash
npm start
```

### 3️⃣ **Login**
- **Usuário**: `admin`
- **Senha**: `admin`

### 4️⃣ **Testar Fluxo QR Code**

1. Na janela principal, clique no botão **"🔗 Conectar WhatsApp"**
2. Uma nova janela deve abrir com o título **"QR Code WhatsApp"**
3. Aguarde alguns segundos:
   - Deve aparecer uma mensagem: **"Inicializando conexão..."**
   - Logo após, o QR Code deve ser exibido
4. Escaneie o QR Code com seu WhatsApp:
   - Abra WhatsApp no celular
   - Vá em **Mais Opções** → **Aparelhos Conectados** → **Conectar Aparelho**
   - Escaneie o QR Code exibido na tela

### 5️⃣ **Verificar Conexão**

Após escanear o QR Code:
- A janela QR deve mostrar: **"✅ WhatsApp conectado com sucesso!"**
- A janela principal deve listar o cliente conectado
- Você pode clicar em **"💬 Abrir Chat"** para conversar

---

## 🐛 Solução de Problemas

### ❌ QR Code não aparece
**Possíveis causas:**
1. Puppeteer não conseguiu inicializar o navegador
   - **Solução**: Verifique se o Chromium do Puppeteer está instalado
   - Execute: `npm install puppeteer --force`

2. Erro de autenticação
   - **Solução**: Delete a pasta `.wwebjs_auth` e tente novamente
   - Execute: `Remove-Item -Recurse -Force .wwebjs_auth`

### ❌ Erro "Cannot find module 'qrcode'"
**Solução:**
```bash
npm install qrcode --save
```

### ❌ Janela QR abre mas fica em branco
**Verifique:**
1. Abra o DevTools da janela QR (Ctrl+Shift+I)
2. Verifique erros no console
3. Confirme que `preload-qr.js` está sendo carregado

---

## 🔍 Logs de Debug

### Ativar Logs Detalhados
Adicione no terminal antes de executar:
```bash
$env:DEBUG="*" ; npm start
```

### Verificar Logs do WhatsApp
Os logs são salvos em:
```
dados/logs/
```

### Comandos Úteis
```bash
# Ver últimos logs
Get-Content .\dados\logs\app-*.log -Tail 50

# Limpar logs antigos
npm run clean

# Verificar estrutura do projeto
npm run verificar
```

---

## 📊 Fluxo Técnico Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO CLICA EM "CONECTAR WHATSAPP"                     │
│    (index.html, linha 113)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FUNÇÃO abrirNovoQR() É CHAMADA                          │
│    (index.html, linha 168)                                   │
│    await window.electronAPI.abrirNovaJanelaQR()             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. PRELOAD BRIDGE INVOCA IPC                               │
│    (preload.js, linha 85)                                    │
│    ipcRenderer.invoke('open-new-qr-window')                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. MAIN PROCESS HANDLER                                     │
│    (main.js, linha 1019)                                     │
│    - Gera clientId único                                     │
│    - Chama createQRWindow(clientId)                         │
│    - Retorna { success: true, clientId }                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. JANELA QR É CRIADA                                       │
│    (main.js, createQRWindow)                                 │
│    - BrowserWindow 400x600                                   │
│    - Carrega qr-window.html                                  │
│    - Preload: preload-qr.js                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. QR WINDOW INICIALIZA                                     │
│    (qr-window.html + preload-qr.js)                          │
│    - Recebe clientId via IPC                                 │
│    - Chama window.qrAPI.startConnection()                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. INICIALIZA CLIENTE WHATSAPP                              │
│    (main.js, inicializarClienteWhatsApp)                    │
│    - Cria instância whatsapp-web.js Client                  │
│    - Configura LocalAuth                                     │
│    - Registra listeners: qr, ready, authenticated           │
│    - Executa client.initialize()                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. EVENTO 'qr' DISPARA                                      │
│    (main.js, client.on('qr'))                                │
│    - Converte QR text para DataURL com qrcode.toDataURL()  │
│    - Envia para janela QR: qr-code event                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. QR CODE É EXIBIDO                                        │
│    (qr-window.html, qrAPI.onQRCode)                          │
│    - Recebe DataURL do QR Code                              │
│    - Define src do <img id="qr-code-img">                   │
│    - Esconde loading, mostra imagem                         │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Validação

- [ ] Aplicação inicia sem erros
- [ ] Login funciona (admin/admin)
- [ ] Botão "Conectar WhatsApp" está visível
- [ ] Ao clicar, janela QR abre
- [ ] Loading aparece ("Inicializando conexão...")
- [ ] QR Code é exibido após alguns segundos
- [ ] QR Code é escaneável (imagem nítida)
- [ ] Após escanear, mensagem de sucesso aparece
- [ ] Cliente aparece na lista de conectados
- [ ] Botão "Abrir Chat" funciona

---

## 📝 Notas Importantes

### Arquivos Modificados na Última Correção:
1. `main.js` (linhas 800-850, 1019-1040)
   - Adicionado `qrcode.toDataURL()` no evento `qr`
   - Adicionado `whatsapp-ready` event para janela QR
   - Separado handlers `open-new-qr-window` e `start-whatsapp-connection`

2. `src/interfaces/preload-qr.js` (linhas 1-45)
   - Alterado `electronAPI` para `qrAPI`
   - Adicionado método `startConnection()`

### Dependências Necessárias:
```json
{
  "whatsapp-web.js": "^1.25.0",
  "qrcode": "^1.5.4",
  "puppeteer": "^23.0.0",
  "qrcode-terminal": "^0.12.0"
}
```

---

## 🚀 Próximos Passos (Opcional)

1. **Múltiplos Clientes**: Testar conectar vários WhatsApps simultaneamente
2. **Persistência**: Verificar se a sessão persiste após fechar e reabrir
3. **Envio de Mensagens**: Testar envio de texto, imagens, vídeos
4. **Recebimento**: Verificar se mensagens recebidas aparecem no chat
5. **Desconexão**: Testar botão de desconectar cliente

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs em `dados/logs/`
2. Execute `npm run diagnostico` para verificar a estrutura
3. Delete `.wwebjs_auth` se houver problemas de autenticação
4. Reinstale dependências: `npm install --force`


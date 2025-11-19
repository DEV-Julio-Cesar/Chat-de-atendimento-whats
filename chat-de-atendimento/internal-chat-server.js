const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9090 });
let clients = new Set();

wss.on('connection', ws => {
    clients.add(ws);
    ws.on('message', raw => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        if (msg.type === 'internal') {
            const payload = {
                type: 'internal',
                from: msg.from,
                texto: msg.texto,
                timestamp: Date.now()
            };
            clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(payload));
            });
        }
    });
    ws.on('close', () => clients.delete(ws));
});
console.log('[InternalChat] WS rodando em ws://localhost:9090');
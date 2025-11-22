// src/core/message-queue.js
// Fila simples em memória para mensagens pendentes quando cliente não está pronto.

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(item) {
    this.queue.push({ ...item, attempts: 0 });
  }

  size() { return this.queue.length; }

  async process(sendFn) {
    if (this.processing) return; // evita concorrência
    this.processing = true;
    try {
      const remaining = [];
      for (const msg of this.queue) {
        try {
          const ok = await sendFn(msg);
          if (!ok) {
            msg.attempts += 1;
            if (msg.attempts < 5) remaining.push(msg); // retry até 5
          }
        } catch(e) {
          msg.attempts += 1;
          if (msg.attempts < 5) remaining.push(msg);
        }
      }
      this.queue = remaining;
    } finally {
      this.processing = false;
    }
  }
}

module.exports = new MessageQueue();

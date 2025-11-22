// src/security/permissions.js
// Matriz simples de permissões por role.
// Actions sem definição explícita são negadas.

const matrix = {
  admin: [
    'user.list','user.create','user.remove','user.set-active',
    'whatsapp.connect','whatsapp.send','whatsapp.pool.manage',
    'metrics.view','metrics.reset','reports.export','chat.history.search'
  ],
  supervisor: [
    'user.list','user.set-active',
    'whatsapp.send','metrics.view','reports.export','chat.history.search'
  ],
  agent: [
    'whatsapp.send','chat.history.search','metrics.view'
  ],
  viewer: [
    'metrics.view'
  ]
};

function can(role, action) {
  if (!role) return false;
  const allowed = matrix[role] || [];
  return allowed.includes(action);
}

module.exports = { can, matrix };

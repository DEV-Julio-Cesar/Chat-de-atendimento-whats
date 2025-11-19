// auth.js
const VALID_USERS = { // Usuários válidos e suas senhas (em produção, use um banco de dados seguro)
    'admin': '1234',
    'user': 'senha123',
    'koldri': '13051987'
};

/**
 * Valida o usuário e a senha.
 * @param {string} username 
 * @param {string} password 
 * @returns {boolean}
 */
function validateCredentials(username, password) {
    const expectedPassword = VALID_USERS[username];
    // Simples comparação: em produção, use hashing (bcrypt, etc.)
    return expectedPassword && expectedPassword === password;
}

module.exports = { validateCredentials };
const fetch = require('node-fetch');

// Função que cria um usuário no Firebase Authentication
async function cadastrarUsuario(email, senha, apiKey) {
  const resposta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: senha,
        returnSecureToken: true,
      }),
    }
  );
  return resposta.json();
}

async function main() {
  const email = process.argv[2];
  const senha = process.argv[3];
  const apiKey = process.argv[4] || process.env.FIREBASE_API_KEY;

  if (!email || !senha) {
    console.error('Uso:');
    console.error('  node scripts/cadastrar_usuario_para_teste.js <email> <senha> <API_KEY>');
    console.error('Ou defina a variável de ambiente FIREBASE_API_KEY');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('Erro: nenhuma API_KEY fornecida.');
    console.error('Forneça como terceiro argumento ou defina FIREBASE_API_KEY no ambiente.');
    process.exit(1);
  }

  try {
    const resultado = await cadastrarUsuario(email, senha, apiKey);

    if (resultado.error) {
      console.error('❌ Erro ao cadastrar usuário:', resultado.error.message);
      process.exit(1);
    }

    console.log('✅ Usuário criado com sucesso!');
    console.log('📧 Email:', resultado.email);
    console.log('🆔 UID (localId):', resultado.localId);
    console.log('🔑 idToken:', resultado.idToken);
    console.log('🔁 refreshToken:', resultado.refreshToken);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

main();

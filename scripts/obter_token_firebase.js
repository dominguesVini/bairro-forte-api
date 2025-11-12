const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Caminho absoluto para o arquivo de credenciais do Firebase
const CAMINHO_ARQUIVO_CREDENCIAIS = path.resolve(__dirname, '../src/auth/firebase-service-account.json');

// Função para login com email e senha
async function loginComEmailSenha(email, senha, apiKey) {
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
    }
  );
  return resp.json();
}

// Função para trocar um token personalizado por um ID token
async function trocarTokenPersonalizado(customToken, apiKey) {
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  return resp.json();
}

async function main() {
  // Captura os argumentos passados na linha de comando
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  const arg3 = process.argv[4];

  const apiKeyDoAmbiente = process.env.FIREBASE_API_KEY;

  if (!arg1) {
    console.error('Uso:');
    console.error('  Login com email/senha: node scripts/obter_token_firebase.js <email> <senha> <API_KEY>');
    console.error('  Ou token personalizado por UID: node scripts/obter_token_firebase.js <uid> <API_KEY>');
    process.exit(1);
  }

  try {
    // Modo email/senha se o primeiro argumento contiver '@'
    if (arg1.includes('@')) {
      const email = arg1;
      const senha = arg2;
      const apiKey = arg3 || apiKeyDoAmbiente;

      if (!senha) {
        console.error('Senha ausente para o login com email.');
        process.exit(1);
      }
      if (!apiKey) {
        console.error('Chave de API ausente. Forneça como terceiro argumento ou defina a variável de ambiente FIREBASE_API_KEY.');
        process.exit(1);
      }

      const resultado = await loginComEmailSenha(email, senha, apiKey);
      if (resultado.error) {
        console.error('Erro de autenticação:', resultado.error);
        process.exit(1);
      }

      console.log('✅ idToken:', resultado.idToken);
      console.log('🔁 refreshToken:', resultado.refreshToken);
      console.log('🆔 localId (uid):', resultado.localId);
      return;
    }

    // Caso contrário, modo UID → token personalizado
    const uid = arg1;
    const apiKeyParaCustom = arg2 || apiKeyDoAmbiente;

    if (!apiKeyParaCustom) {
      console.error('Chave de API ausente. Forneça como segundo argumento ou defina FIREBASE_API_KEY como variável de ambiente.');
      process.exit(1);
    }

    if (!fs.existsSync(CAMINHO_ARQUIVO_CREDENCIAIS)) {
      console.error('Arquivo de credenciais não encontrado em:', CAMINHO_ARQUIVO_CREDENCIAIS);
      console.error('Verifique se o arquivo existe e se o caminho está correto.');
      process.exit(1);
    }

    try {
      const credenciais = require(CAMINHO_ARQUIVO_CREDENCIAIS);
      admin.initializeApp({
        credential: admin.credential.cert(credenciais),
      });
    } catch (err) {
      console.error('Erro ao carregar o arquivo de credenciais:', err.message);
      process.exit(1);
    }

    const customToken = await admin.auth().createCustomToken(uid);
    const corpo = await trocarTokenPersonalizado(customToken, apiKeyParaCustom);

    if (corpo.error) {
      console.error('Erro ao trocar o token personalizado:', corpo);
      process.exit(1);
    }

    console.log('✅ idToken:', corpo.idToken);
    console.log('🔁 refreshToken:', corpo.refreshToken);
    console.log('🆔 localId (uid):', corpo.localId);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

main();

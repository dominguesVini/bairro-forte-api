# 🏙️ API Bairro Forte

Serviço responsável por fornecer os endpoints da aplicação **Bairro Forte**, uma plataforma de segurança colaborativa entre moradores e comércios.

---

## Instruções de Execução

Assumindo que você já está no terminal dentro da **pasta raiz do projeto**:

---

###  Pré-requisitos

# Variaveis de ambiente

Dentro de `src/auth/firebase-service-account.json` deve-se colocar o json enviado nas intruções da monografia,

criar o arquivo `.env` na raiz do projeto, no mesmo nivel de `.env-example` e colocar as variaveis enviadas nas intruções.

caso for utilizar via Dockerfile, colocar as variaveis também enviadas nas intruções.

Escolha uma das opções abaixo conforme seu ambiente:

#### Opção Local:
- **Node.js** instalado (versão 18 ou superior)
- **NPM** (geralmente instalado junto com o Node.js)

#### Opção Docker:
- **Docker** instalado e em execução na sua máquina

---

###  Opção 1: Execução Local (via NPM)

Ideal para ambiente de **desenvolvimento** e **depuração**.

#### Passo 1: Instalar dependências
Baixe todas as bibliotecas necessárias listadas no `package.json`:

```bash
npm install
```
#### Passo 2: rodar localmente

```bash
npm  start
```

####  Verificando a API

 Após iniciar o serviço, acesse no navegador ou via Postman, foi disponibilizado a collection do postman com as rotas;

 para castrar um usuário de teste uma vez que esse gerenciamento de login é feito pelo flutterFlow
 então apenas para testes executar:

```bash
 node scripts/cadastrar_usuario_para_teste.js <email> <senha> <token para gerar usuarios>
```

para recuperar um token para utilizar nas chamadas executar;

```bash
 node scripts/obter_token_firebase.js <email> <senha> <token para gerar usuarios>
```

após o cadastro no firebase então é possivel chamar a rota `/users` com:
```bash
{
    "name":"<nome do usuário>",
    "email":"<email utilizado para cadastro no firebase>",
    "role":"Morador",
    "gender":"Masculino",//Feminino
    "latitude":"-25.562",//latitude do usuário no momento de cadastro
    "longitude":"-51.488",//longitude do usuário no momento de cadastro
    "city_id": 4109401,//Guarapauava
    "phone":"<telefone>"
}
```
esse fluxo é feito automaticamente pelo front-end, afins de teste favor executar conforme o collection do postman disponivel no zip
é so atribuir a variavel ambiente o valor https://localhost/

###  Opção 2: Execução via Docker

Na raiz do projeto (onde está o Dockerfile)

#### Passo 1: Build da imagem


```bash
docker build -t api_bairro_forte .
```

#### Passo 2: Build da imagem

```bash
docker run -d -p 443:443 --name api_bairro_forte api_bairro_forte
```

#### Passo 3 (opcional): Ver logs

```bash
docker logs -f api_bairro_forte
```

####  Verificando a API

 Após iniciar o serviço, acesse no navegador ou via Postman: https://localhost/
# 🏴‍☠️ Maré Negra — Bot de Metas

Bot Discord para registrar e aprovar depósitos de moedas da tripulação, com controle de ciclo semanal por membro.

---

## Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuito)
- Bot criado no [Discord Developer Portal](https://discord.com/developers/applications)

---

## 1. Criar o Bot no Discord

1. Acesse o Developer Portal → **New Application**
2. Vá em **Bot** → clique em **Add Bot**
3. Em **Privileged Gateway Intents**, habilite **Server Members Intent** (para DMs)
4. Copie o **Token** do bot → coloque em `DISCORD_TOKEN` no `.env`
5. Em **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Read Message History`
6. Use a URL gerada para convidar o bot ao servidor

---

## 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo de `supabase-schema.sql`
3. Em **Settings → API**, copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_KEY`

---

## 3. Configurar o Google Sheets (opcional, para o painel)

1. Crie uma planilha com a aba **Histórico** com as colunas:
   - A: Discord ID | B: Nome | C: Quantidade | D: Aprovado em | E: Print URL
2. Na planilha: **Extensões → Apps Script**
3. Cole o conteúdo de `google-apps-script.js`
4. Clique em **Implantar → Nova implantação**:
   - Tipo: **Aplicativo da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
5. Copie a URL gerada → coloque em `SHEETS_WEBHOOK_URL` no `.env`

---

## 4. Instalar e Configurar

```bash
npm install

cp .env.example .env
# Preencha os valores no .env
```

Valores necessários no `.env`:

| Variável | Onde encontrar |
|---|---|
| `DISCORD_TOKEN` | Developer Portal → Bot → Token |
| `CLIENT_ID` | Developer Portal → General Information → Application ID |
| `GUILD_ID` | Discord: clique direito no servidor → Copiar ID |
| `CANAL_APROVACAO_ID` | Discord: clique direito no canal do líder → Copiar ID |
| `CARGO_LIDER_ID` | Discord: Configurações → Cargos → clique direito → Copiar ID |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_KEY` | Supabase → Settings → API → service_role key |
| `SHEETS_WEBHOOK_URL` | Google Apps Script → URL da implantação |

> Para copiar IDs no Discord: ative o **Modo Desenvolvedor** em Configurações → Avançado.

---

## 5. Rodar

```bash
# Registra os slash commands no servidor (rode uma vez, e novamente ao adicionar comandos)
npm run deploy

# Inicia o bot
npm start
```

---

## Comandos disponíveis

### Membros

| Comando | Descrição |
|---|---|
| `/deposito <quantidade> <print>` | Envia um depósito para aprovação do líder |
| `/meu-historico` | Vê seus últimos 10 depósitos e total aprovado |
| `/ranking` | Ranking geral de moedas da tripulação |
| `/status-semana` | Mostra quem depositou e quem não depositou na semana atual |

### Líder

| Comando | Descrição |
|---|---|
| `/pagar @membro` | Registra o pagamento do membro e inicia uma nova semana para ele |

> Os botões **Aprovar / Recusar** no canal de aprovação também são exclusivos do líder.

---

## Fluxo de pagamento semanal

1. O líder usa `/pagar @membro` quando um membro quita sua dívida — isso zera e inicia um novo ciclo para aquela pessoa.
2. A partir desse momento, qualquer `/deposito` aprovado conta para a semana nova.
3. Use `/status-semana` a qualquer momento para ver quem já depositou (✅) e quem ainda não depositou (❌) no ciclo atual de cada membro.

---

## Estrutura de arquivos

```
index.js              # Bot principal (comandos e lógica)
deploy-commands.js    # Registra slash commands no Discord (rodar uma vez)
supabase.js           # Inicializa o cliente Supabase
sheets.js             # Envia dados ao Google Sheets após aprovação
supabase-schema.sql   # Schema das tabelas (executar no Supabase SQL Editor)
google-apps-script.js # Script para o Google Sheets
.env                  # Variáveis de ambiente (não commitar)
env.example           # Exemplo de .env
```

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('deposito')
    .setDescription('Envia um depósito de moedas para aprovação do líder')
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de moedas depositadas')
        .setRequired(true)
        .setMinValue(1)
    )
    .addAttachmentOption(opt =>
      opt.setName('print')
        .setDescription('Print do comprovante do depósito')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('meu-historico')
    .setDescription('Veja seus últimos depósitos'),

  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Ranking de moedas da tripulação'),

  new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Registra pagamento e inicia nova semana para um membro (só líder)')
    .addMentionableOption(opt =>
      opt.setName('membro')
        .setDescription('Membro que realizou o pagamento')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('status-semana')
    .setDescription('Mostra quem depositou e quem não depositou na semana atual'),
].map(cmd => cmd.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

console.log('Registrando slash commands...');

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);

console.log('Slash commands registrados com sucesso!');

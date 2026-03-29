import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags,
} from 'discord.js';
import { supabase } from './supabase.js';
import { notificarSheets } from './sheets.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});

// ─── Pronto ──────────────────────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
  console.log(`Bot online como ${client.user.tag}`);
  console.log(`Servidores: ${client.guilds.cache.map(g => `${g.name} (${g.id})`).join(', ')}`);
  console.log(`Canal de aprovação configurado: ${process.env.CANAL_APROVACAO_ID}`);
});

// ─── Slash Commands ───────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'deposito')       await cmdDeposito(interaction);
    if (commandName === 'meu-historico')  await cmdHistorico(interaction);
    if (commandName === 'ranking')        await cmdRanking(interaction);
    if (commandName === 'pagar')          await cmdPagar(interaction);
    if (commandName === 'status-semana')  await cmdStatusSemana(interaction);
  }

  if (interaction.isButton()) {
    await handleBotao(interaction);
  }
});

// ─── /deposito ────────────────────────────────────────────────────────────────
async function cmdDeposito(interaction) {
  console.log(`[/deposito] Recebido de ${interaction.user.username} (${interaction.user.id})`);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const quantidade = interaction.options.getInteger('quantidade');
  const print      = interaction.options.getAttachment('print');
  console.log(`[/deposito] quantidade=${quantidade} | print=${print?.url} | contentType=${print?.contentType}`);

  // Valida se é imagem
  if (!print.contentType?.startsWith('image/')) {
    console.warn('[/deposito] Arquivo não é imagem, rejeitando.');
    return interaction.editReply({
      content: '❌ O print precisa ser uma imagem (PNG, JPG, etc).',
    });
  }

  const discordId   = interaction.user.id;
  const nomeUsuario = interaction.member.displayName;

  // Salva no Supabase como pendente
  console.log('[Supabase] Inserindo depósito...');
  const { data, error } = await supabase
    .from('depositos')
    .insert({
      discord_id:   discordId,
      nome_usuario: nomeUsuario,
      quantidade,
      print_url:    print.url,
      status:       'pendente',
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Erro ao inserir:', error);
    return interaction.editReply({ content: '❌ Erro interno. Tente novamente.' });
  }
  console.log(`[Supabase] Depósito inserido com id=${data.id}`);

  // Monta embed para o canal do líder
  const embed = new EmbedBuilder()
    .setTitle('💰 Novo depósito para aprovação')
    .setColor(0xF5A623)
    .setImage(print.url)
    .addFields(
      { name: 'Membro',      value: `<@${discordId}> (${nomeUsuario})`, inline: true },
      { name: 'Quantidade',  value: `**${quantidade.toLocaleString('pt-BR')} moedas**`,   inline: true },
      { name: 'Enviado em',  value: `<t:${Math.floor(Date.now() / 1000)}:f>` },
    )
    .setFooter({ text: `ID do depósito: ${data.id}` });

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${data.id}`)
      .setLabel('✅  Aprovar')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`recusar_${data.id}`)
      .setLabel('❌  Recusar')
      .setStyle(ButtonStyle.Danger),
  );

  // Envia para o canal do líder
  console.log(`[Discord] Buscando canal de aprovação id=${process.env.CANAL_APROVACAO_ID}...`);
  let canalAprovacao;
  try {
    canalAprovacao = await client.channels.fetch(process.env.CANAL_APROVACAO_ID);
    console.log(`[Discord] Canal encontrado: #${canalAprovacao.name} (${canalAprovacao.id}) no servidor "${canalAprovacao.guild?.name}"`);
  } catch (err) {
    console.error(`[Discord] Falha ao buscar canal: ${err.message} (code=${err.code})`);
    return interaction.editReply({ content: '❌ Erro: o bot não tem acesso ao canal de aprovação. Contate o administrador.' });
  }
  console.log('[Discord] Enviando embed para o canal de aprovação...');
  await canalAprovacao.send({ embeds: [embed], components: [botoes] });

  await interaction.editReply({
    content: `✅ Depósito de **${quantidade.toLocaleString('pt-BR')} moedas** enviado para aprovação do líder!`,
  });
}

// ─── Botões Aprovar / Recusar ─────────────────────────────────────────────────
async function handleBotao(interaction) {
  // Só líder pode clicar
  const isLider = interaction.member.roles.cache.has(process.env.CARGO_LIDER_ID);
  if (!isLider) {
    return interaction.reply({
      content: '🚫 Apenas o líder pode aprovar ou recusar depósitos.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const [acao, depositoId] = interaction.customId.split('_');
  await interaction.deferUpdate();

  // Busca o depósito
  const { data: deposito, error } = await supabase
    .from('depositos')
    .select('*')
    .eq('id', depositoId)
    .single();

  if (error || !deposito) {
    return interaction.followUp({ content: '❌ Depósito não encontrado.', flags: MessageFlags.Ephemeral });
  }

  if (deposito.status !== 'pendente') {
    return interaction.followUp({
      content: `⚠️ Este depósito já foi **${deposito.status}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const agora       = new Date().toISOString();
  const novoStatus  = acao === 'aprovar' ? 'aprovado' : 'recusado';
  const liderNome   = interaction.user.username;

  // Atualiza no Supabase
  await supabase
    .from('depositos')
    .update({ status: novoStatus, aprovado_em: agora, aprovado_por: liderNome })
    .eq('id', depositoId);

  // Edita a mensagem original removendo os botões
  const corEmbed  = novoStatus === 'aprovado' ? 0x2ecc71 : 0xe74c3c;
  const iconEmbed = novoStatus === 'aprovado' ? '✅' : '❌';

  const embedAtualizado = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(corEmbed)
    .setTitle(`${iconEmbed} Depósito ${novoStatus} por ${liderNome}`);

  await interaction.editReply({ embeds: [embedAtualizado], components: [] });

  // Notifica o membro por DM
  try {
    const membro = await client.users.fetch(deposito.discord_id);
    if (novoStatus === 'aprovado') {
      await membro.send(
        `✅ **Depósito aprovado!**\nSeu depósito de **${deposito.quantidade.toLocaleString('pt-BR')} moedas** foi confirmado pelo líder ${liderNome}. Bom trabalho, tripulante! 🏴‍☠️`
      );
      // Envia para o Google Sheets
      await notificarSheets({ ...deposito, aprovado_em: agora });
    } else {
      await membro.send(
        `❌ **Depósito recusado.**\nSeu depósito de **${deposito.quantidade.toLocaleString('pt-BR')} moedas** foi recusado por ${liderNome}. Entre em contato para mais detalhes.`
      );
    }
  } catch {
    console.warn(`[DM] Não foi possível enviar DM para ${deposito.discord_id}`);
  }
}

// ─── /meu-historico ───────────────────────────────────────────────────────────
async function cmdHistorico(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { data, error } = await supabase
    .from('depositos')
    .select('quantidade, status, created_at')
    .eq('discord_id', interaction.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data?.length) {
    return interaction.editReply({ content: 'Você ainda não tem depósitos registrados.' });
  }

  const totalAprovado = data
    .filter(d => d.status === 'aprovado')
    .reduce((acc, d) => acc + d.quantidade, 0);

  const linhas = data.map(d => {
    const icone = d.status === 'aprovado' ? '✅' : d.status === 'recusado' ? '❌' : '⏳';
    const data_ = new Date(d.created_at);
    const dia   = data_.toLocaleDateString('pt-BR');
    return `${icone} \`${d.quantidade.toLocaleString('pt-BR')} moedas\` — ${dia}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`📋 Seu histórico de depósitos`)
    .setColor(0x5865F2)
    .setDescription(linhas.join('\n'))
    .addFields({ name: 'Total aprovado', value: `**${totalAprovado.toLocaleString('pt-BR')} moedas**` })
    .setFooter({ text: 'Últimos 10 depósitos' });

  await interaction.editReply({ embeds: [embed] });
}

// ─── /ranking ────────────────────────────────────────────────────────────────
async function cmdRanking(interaction) {
  await interaction.deferReply();

  const { data, error } = await supabase
    .from('depositos')
    .select('discord_id, nome_usuario, quantidade')
    .eq('status', 'aprovado');

  if (error || !data?.length) {
    return interaction.editReply({ content: 'Nenhum depósito aprovado ainda.' });
  }

  // Agrupa por usuário
  const totais = {};
  for (const d of data) {
    if (!totais[d.discord_id]) totais[d.discord_id] = { nome: d.nome_usuario, total: 0 };
    totais[d.discord_id].total += d.quantidade;
  }

  const ranking = Object.entries(totais)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10);

  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas   = ranking.map(([id, info], i) => {
    const medalha = medalhas[i] ?? `${i + 1}.`;
    return `${medalha} <@${id}> — **${info.total.toLocaleString('pt-BR')} moedas**`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🏴‍☠️ Ranking da Maré Negra')
    .setColor(0xF5A623)
    .setDescription(linhas.join('\n'))
    .setFooter({ text: 'Apenas depósitos aprovados' });

  await interaction.editReply({ embeds: [embed] });
}

// ─── /pagar ───────────────────────────────────────────────────────────────────
async function cmdPagar(interaction) {
  const isLider = interaction.member.roles.cache.has(process.env.CARGO_LIDER_ID);
  if (!isLider) {
    return interaction.reply({
      content: '🚫 Apenas o líder pode registrar pagamentos.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const membro = interaction.options.getMember('membro');
  const discordId   = membro.user.id;
  const nomeUsuario = membro.displayName;

  console.log(`[/pagar] Líder ${interaction.user.username} pagando ciclo de ${nomeUsuario} (${discordId})`);

  const { error } = await supabase
    .from('membros')
    .upsert({ discord_id: discordId, nome_usuario: nomeUsuario, ciclo_iniciado_em: new Date().toISOString() });

  if (error) {
    console.error('[Supabase] Erro ao registrar pagamento:', error);
    return interaction.editReply({ content: '❌ Erro interno. Tente novamente.' });
  }

  console.log(`[/pagar] Ciclo zerado para ${nomeUsuario}`);
  await interaction.editReply({
    content: `✅ Pagamento registrado! Nova semana iniciada para **${nomeUsuario}**.`,
  });
}

// ─── /status-semana ───────────────────────────────────────────────────────────
async function cmdStatusSemana(interaction) {
  await interaction.deferReply();

  console.log('[/status-semana] Buscando membros...');

  const { data: membros, error: erroMembros } = await supabase
    .from('membros')
    .select('discord_id, nome_usuario, ciclo_iniciado_em')
    .order('nome_usuario');

  if (erroMembros || !membros?.length) {
    return interaction.editReply({ content: 'Nenhum membro registrado ainda. Use `/pagar` para iniciar o ciclo de alguém.' });
  }

  const { data: depositos, error: erroDepositos } = await supabase
    .from('depositos')
    .select('discord_id, quantidade, status, created_at')
    .eq('status', 'aprovado');

  if (erroDepositos) {
    console.error('[Supabase] Erro ao buscar depósitos:', erroDepositos);
    return interaction.editReply({ content: '❌ Erro interno.' });
  }

  const linhas = membros.map(m => {
    const desde = new Date(m.ciclo_iniciado_em);
    const totalSemana = (depositos ?? [])
      .filter(d => d.discord_id === m.discord_id && new Date(d.created_at) >= desde)
      .reduce((acc, d) => acc + d.quantidade, 0);

    const icone = totalSemana > 0 ? '✅' : '❌';
    const semana = desde.toLocaleDateString('pt-BR');
    return `${icone} **${m.nome_usuario}** — ${totalSemana.toLocaleString('pt-BR')} moedas (desde ${semana})`;
  });

  const embed = new EmbedBuilder()
    .setTitle('📊 Status da Semana')
    .setColor(0x5865F2)
    .setDescription(linhas.join('\n'))
    .setFooter({ text: '✅ depositou | ❌ ainda não depositou' });

  await interaction.editReply({ embeds: [embed] });
}

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);

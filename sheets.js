export async function notificarSheets(deposito) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url || url.includes('SEU_ID')) return;

  const payload = {
    discord_id:  deposito.discord_id,
    nome:        deposito.nome_usuario,
    quantidade:  deposito.quantidade,
    data:        deposito.aprovado_em,
    print_url:   deposito.print_url,
  };

  console.log('[Sheets] Enviando depósito:', JSON.stringify(payload));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('[Sheets] Resposta HTTP:', res.status);
  } catch (err) {
    console.warn('[Sheets] Falha ao notificar:', err.message);
  }
}

export async function zerarMembroSheets(discordId) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url || url.includes('SEU_ID')) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action:     'pagar',
        discord_id: discordId,
      }),
    });
  } catch (err) {
    console.warn('[Sheets] Falha ao registrar pagamento:', err.message);
  }
}

export async function notificarSheets(deposito) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url || url.includes('SEU_ID')) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discord_id:  deposito.discord_id,
        nome:        deposito.nome_usuario,
        quantidade:  deposito.quantidade,
        aprovado_em: deposito.aprovado_em,
        print_url:   deposito.print_url,
      }),
    });
  } catch (err) {
    console.warn('[Sheets] Falha ao notificar:', err.message);
  }
}

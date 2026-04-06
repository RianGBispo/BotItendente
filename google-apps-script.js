/**
 * Cole este código no Google Apps Script vinculado à sua planilha:
 * Extensões → Apps Script → cole e publique como Web App
 *
 * A planilha precisa ter:
 *   Aba "Histórico"  → A: Discord ID | B: Nome | C: Quantidade | D: Aprovado em | E: Print URL | F: Pago
 *   Aba "Tripulação" → A: Discord ID | B: Nome | C: Total de moedas (acumulado)
 *
 * IMPORTANTE: Formate a coluna A de ambas as abas como "Texto simples"
 * para evitar perda de precisão nos IDs do Discord.
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Registrar pagamento: marca todos os depósitos do membro como pago = true ──
    if (payload.action === 'pagar') {
      const id = String(payload.discord_id);

      const abaHistorico = ss.getSheetByName('Histórico');
      const displayHistorico = abaHistorico.getDataRange().getDisplayValues();

      for (let i = 1; i < displayHistorico.length; i++) {
        if (displayHistorico[i][0] === id) {
          abaHistorico.getRange(i + 1, 6).setValue(true); // coluna F = Pago
        }
      }

      // Zera o total acumulado na aba Tripulação
      const abaTotais = ss.getSheetByName('Tripulação');
      const displayTotais = abaTotais.getDataRange().getDisplayValues();

      for (let i = 1; i < displayTotais.length; i++) {
        if (displayTotais[i][0] === id) {
          abaTotais.getRange(i + 1, 3).setValue(0);
          break;
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Registrar depósito aprovado ─────────────────────────────────
    // Proteção: se quantidade não é número, é uma chamada inválida
    if (typeof payload.quantidade !== 'number') {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'quantidade inválida' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const id = String(payload.discord_id);

    const abaHistorico = ss.getSheetByName('Histórico');
    abaHistorico.appendRow([
      id,
      payload.nome,
      payload.quantidade,
      payload.data,
      payload.print_url,
      false, // coluna F = Pago (começa como false)
    ]);

    const abaTotais = ss.getSheetByName('Tripulação');
    const displayTotais = abaTotais.getDataRange().getDisplayValues();
    let linhaExistente = -1;

    for (let i = 1; i < displayTotais.length; i++) {
      if (displayTotais[i][0] === id) {
        linhaExistente = i + 1;
        break;
      }
    }

    if (linhaExistente > 0) {
      const rawTotal = abaTotais.getRange(linhaExistente, 3).getValue();
      const totalAtual = (typeof rawTotal === 'number' && !isNaN(rawTotal)) ? rawTotal : 0;
      abaTotais.getRange(linhaExistente, 3).setValue(totalAtual + payload.quantidade);
    } else {
      abaTotais.appendRow([id, payload.nome, payload.quantidade]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

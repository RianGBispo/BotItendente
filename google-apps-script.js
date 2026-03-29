/**
 * Cole este código no Google Apps Script vinculado à sua planilha:
 * Extensões → Apps Script → cole e publique como Web App
 *
 * A planilha precisa ter uma aba chamada "Histórico" com as colunas:
 * A: Discord ID | B: Nome | C: Quantidade | D: Aprovado em | E: Print URL
 *
 * E uma aba "Totais" com:
 * A: Discord ID | B: Nome | C: Total de moedas
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Aba Histórico ───────────────────────────────────────
    const abaHistorico = ss.getSheetByName('Histórico');
    abaHistorico.appendRow([
      payload.discord_id,
      payload.nome,
      payload.quantidade,
      payload.aprovado_em,
      payload.print_url,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

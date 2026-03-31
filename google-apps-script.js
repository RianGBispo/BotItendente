/**
 * Cole este código no Google Apps Script vinculado à sua planilha:
 * Extensões → Apps Script → cole e publique como Web App
 *
 * A planilha precisa ter uma aba chamada "Histórico" com as colunas:
 * A: Discord ID | B: Nome | C: Quantidade | D: Aprovado em | E: Print URL | F: Zerado
 *
 * E uma aba "Tripulação" com:
 * A: Discord ID | B: Nome | C: Total de moedas (fórmula: =SUMIFS(Histórico!C:C,Histórico!A:A,A2,Histórico!F:F,FALSE))
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Zerar ciclo de um membro ────────────────────────────────
    if (payload.action === 'zerar') {
      const abaHistorico = ss.getSheetByName('Histórico');
      const dados = abaHistorico.getDataRange().getValues();

      for (let i = 1; i < dados.length; i++) {
        if (String(dados[i][0]) === String(payload.discord_id)) {
          abaHistorico.getRange(i + 1, 6).setValue(true); // coluna F = Zerado
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Registrar depósito aprovado ─────────────────────────────
    const abaHistorico = ss.getSheetByName('Histórico');
    abaHistorico.appendRow([
      payload.discord_id,
      payload.nome,
      payload.quantidade,
      payload.aprovado_em,
      payload.print_url,
      false, // F: Zerado = false por padrão
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

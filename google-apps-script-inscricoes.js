/**
 * Google Apps Script para o Terreiro de Ideias
 * Como usar:
 * 1. Acesse https://script.google.com
 * 2. Crie um novo projeto
 * 3. Cole este código
 * 4. Clique em Implantar > Nova implantação > App da Web
 * 5. Executar como: você mesmo
 * 6. Quem tem acesso: Qualquer pessoa
 * 7. Copie a URL e cole no config.js em googleAppsScriptURL
 */
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents || '{}');
  const tipo = data.tipo || 'registro';
  let sheet = ss.getSheetByName(tipo);
  if (!sheet) sheet = ss.insertSheet(tipo);
  const now = new Date();
  const participante = data.participante || data;
  const row = [
    now,
    tipo,
    participante.nome || data.nome || '',
    participante.cpf || data.cpf || '',
    participante.email || data.email || '',
    participante.telefone || data.telefone || '',
    participante.cidade || data.cidade || '',
    participante.profissao || data.profissao || '',
    participante.instituicao || data.instituicao || '',
    JSON.stringify(data)
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Data','Tipo','Nome','CPF','Email','Telefone','Cidade','Profissão','Instituição','Dados completos']);
  }
  sheet.appendRow(row);
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}

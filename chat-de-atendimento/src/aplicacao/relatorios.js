const fs = require('fs-extra');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const metricas = require('./metricas');

const OUT_DIR = path.join(__dirname, '../../dados/relatorios');

async function exportarPDF() {
  await fs.ensureDir(OUT_DIR);
  const { metricas: m } = await metricas.obterMetricas();
  const file = path.join(OUT_DIR, `relatorio-${Date.now()}.pdf`);

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(file);
  doc.pipe(stream);

  doc.fontSize(20).text('Relatório de Métricas', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleString()}`);
  doc.moveDown().moveDown();

  const linhas = [
    ['Mensagens Enviadas', m.mensagensEnviadas],
    ['Mensagens Recebidas', m.mensagensRecebidas],
    ['Total de Mensagens', m.totalMensagens],
    ['Conversas Ativas', m.totalConversas],
    ['Clientes Ativos', m.clientesAtivos],
    ['Média de Resposta (R/E)', m.mediaResposta]
  ];

  linhas.forEach(([k, v]) => doc.fontSize(14).text(`${k}: ${v}`));
  doc.end();

  await new Promise(res => stream.on('finish', res));
  return { success: true, file };
}

async function exportarExcel() {
  await fs.ensureDir(OUT_DIR);
  const { metricas: m } = await metricas.obterMetricas();
  const file = path.join(OUT_DIR, `relatorio-${Date.now()}.xlsx`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Métricas');

  ws.columns = [
    { header: 'Métrica', key: 'nome', width: 30 },
    { header: 'Valor', key: 'valor', width: 20 }
  ];

  const dados = [
    { nome: 'Mensagens Enviadas', valor: m.mensagensEnviadas },
    { nome: 'Mensagens Recebidas', valor: m.mensagensRecebidas },
    { nome: 'Total de Mensagens', valor: m.totalMensagens },
    { nome: 'Conversas Ativas', valor: m.totalConversas },
    { nome: 'Clientes Ativos', valor: m.clientesAtivos },
    { nome: 'Média de Resposta (R/E)', valor: m.mediaResposta }
  ];

  ws.addRows(dados);
  await wb.xlsx.writeFile(file);
  return { success: true, file };
}

async function exportar(tipo) {
  if (tipo === 'pdf') return exportarPDF();
  if (tipo === 'xlsx') return exportarExcel();
  return { success: false, message: 'Tipo inválido (use pdf|xlsx)' };
}

module.exports = { exportar };
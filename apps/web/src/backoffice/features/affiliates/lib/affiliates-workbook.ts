import 'server-only';
import ExcelJS from 'exceljs';
import type { AffiliatesSheet } from './affiliates-sheet';

/** O `.xlsx` da planilha de afiliados. É o único lugar que conhece o `exceljs`. */
export async function writeAffiliatesWorkbook(sheet: AffiliatesSheet): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Afiliados', {
    // O cabeçalho fica parado enquanto a base rola por baixo dele.
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = sheet.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
    style: column.numFmt ? { numFmt: column.numFmt } : {},
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.addRows(sheet.rows);

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

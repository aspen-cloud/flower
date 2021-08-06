import XLSX from "xlsx";
import { Column, Table } from "../types";
import { saveAs } from "file-saver";

export async function csvToJson(file: File) {
  const data = await new Response(file).arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const json_data = XLSX.utils.sheet_to_json(
    workbook.Sheets[Object.keys(workbook.Sheets)[0]], // todo: Possibly load all "Sheets" as separate data sources?
    { raw: false },
  ) as any[];

  return json_data;
}

export function tableToCsv(table: Table) {
  const { columns, rows } = table;
  const tableMatrix: string[][] = [
    columns.map((c) => c.Header),
    ...Array(rows.length)
      .fill(undefined)
      .map(() => []),
  ];
  columns.forEach((column) =>
    rows.forEach((row, i) =>
      tableMatrix[i + 1].push(row[column.accessor].readValue),
    ),
  );

  return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(tableMatrix));
}

export function download(content: string, filename: string) {
  var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, filename);
}

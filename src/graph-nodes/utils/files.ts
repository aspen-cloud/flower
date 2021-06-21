import XLSX from "xlsx";

export async function csvToJson(file) {
  const data = await new Response(file).arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const json_data = XLSX.utils.sheet_to_json(
    workbook.Sheets[Object.keys(workbook.Sheets)[0]], // todo: Possibly load all "Sheets" as separate data sources?
    { raw: false },
  ) as any[];

  return json_data;
}

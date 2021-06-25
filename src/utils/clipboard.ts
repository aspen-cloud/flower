import XLSX from "xlsx";

export interface ClipboardParseResult {
  type: "text" | "table" | "nodes";
  data: any;
}

export const addElementsToClipboard = async (els) => {
  const str = JSON.stringify(els);
  await navigator.clipboard.writeText(str || "");
};

export const tryParseSpreadsheet = (text: string) => {
  const workbook = XLSX.read(text, { type: "string" });
  const json_data = XLSX.utils.sheet_to_json(
    workbook.Sheets[Object.keys(workbook.Sheets)[0]], // todo: Possibly load all "Sheets" as separate data sources?
    { raw: false },
  ) as any[];
  return json_data;
};

export async function parseClipboard(
  event: ClipboardEvent | null,
): Promise<ClipboardParseResult> {
  const textData =
    event?.clipboardData?.getData("text/plain") ??
    (await navigator.clipboard.readText());

  let jsonData = null;
  try {
    jsonData = JSON.parse(textData);
  } catch {}

  if (jsonData) {
    return {
      type: "nodes",
      data: jsonData,
    };
  }

  const parsedSpreadsheet = tryParseSpreadsheet(textData);
  if (parsedSpreadsheet) {
    return {
      type: "table",
      data: parsedSpreadsheet,
    };
  }

  return {
    type: "text",
    data: textData,
  };
}

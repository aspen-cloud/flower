export interface ClipboardParseResult {
  type: "text" | "table" | "nodes";
  data: any;
}

export const addElementsToClipboard = async (els) => {
  const str = JSON.stringify(els);
  await navigator.clipboard.writeText(str || "");
};

export const tryParseSpreadsheet = (text: string) => {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null; // assume single line as text

  const DELIMITERS = ["\t", ","];
  let matchingDelimiter = DELIMITERS[0];
  for (const delimiter of DELIMITERS) {
    // Spreadsheet if each row has matching delimiter count
    const splitLines = lines.map((line) => line.trim().split(delimiter));
    const expectedColumnCount = splitLines[0].length;

    // if no delimter (1 column) try others
    if (expectedColumnCount < 2) continue;

    const isSpreadsheet = splitLines.every(
      (line) => line.length === expectedColumnCount,
    );
    if (isSpreadsheet) {
      matchingDelimiter = delimiter;
      break;
    }
  }

  return lines.map((line) => line.trim().split(matchingDelimiter));
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

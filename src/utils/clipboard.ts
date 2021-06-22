interface ClipboardParseResult {
  type: "text" | "table";
  data: any;
}

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

export function parseClipboard(
  clipboardData: DataTransfer,
): ClipboardParseResult {
  const textData = clipboardData.getData("text");

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

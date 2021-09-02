import XLSX from "xlsx";

import { GraphEdge, GraphNode } from "../graph-store";
import { jsonToTable } from "./tables";

export interface ClipboardParseResult {
  type: "text" | "table" | "nodes";
  data: any;
}

export interface ElementClipboardContext {
  element: any;
  xOffset?: number;
  yOffset?: number;
}

export const addElementsToClipboard = async (
  nodes: GraphNode[],
  edges: GraphEdge[],
) => {
  // TODO: offset so paste is centered (currently pastes at top left corner)
  const topLeft = {
    x: Math.min(...nodes.map((el) => el.position?.x)),
    y: Math.min(...nodes.map((el) => el.position?.y)),
  };
  const clipboardNodes: ElementClipboardContext[] = nodes.map((node) => ({
    element: node,
    xOffset: node.position?.x - topLeft.x,
    yOffset: node.position?.y - topLeft.y,
  }));
  const clipboardEdges: ElementClipboardContext[] = edges.map((edge) => ({
    element: edge,
  }));

  const str = JSON.stringify(clipboardNodes.concat(clipboardEdges));
  await navigator.clipboard.writeText(str || "");
};

const tryParseSpreadsheet = (text: string) => {
  const workbook = XLSX.read(text, { type: "string" });

  // If only once cell worth of parsed content, assume text and fail
  if (
    workbook.SheetNames.length === 1 &&
    workbook.Sheets[workbook.SheetNames[0]]["!ref"] === "A1"
  ) {
    return undefined;
  }
  const json_data = XLSX.utils.sheet_to_json<any>(
    workbook.Sheets[Object.keys(workbook.Sheets)[0]],
    { raw: false },
  );
  return jsonToTable(json_data);
};

const tryParseJsonUrl = async (urlString: string) => {
  try {
    const url = new URL(urlString);
    const result = await fetch(url.href);
    const json = await result.json();
    if (json.columns && json.rows) {
      return { columns: json.columns, rows: json.rows };
    }
  } catch (e) {
    console.log(e);
  }
  return undefined;
};

const tryParseJsonElements = (elementsJsonString: string) => {
  try {
    return JSON.parse(elementsJsonString) as ElementClipboardContext[];
  } catch {
    return undefined;
  }
};

export async function parseClipboard(
  event: ClipboardEvent | null,
): Promise<ClipboardParseResult> {
  const textData =
    event?.clipboardData?.getData("text/plain") ??
    (await navigator.clipboard.readText());

  const parsedJsonUrl = await tryParseJsonUrl(textData);
  if (parsedJsonUrl) {
    return {
      type: "table",
      data: parsedJsonUrl,
    };
  }

  const parsedJsonElements = tryParseJsonElements(textData);
  if (parsedJsonElements) {
    return {
      type: "nodes",
      data: parsedJsonElements,
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

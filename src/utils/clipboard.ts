import XLSX from "xlsx";

import { GraphEdge, GraphNode } from "../graph-store";

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

export const tryParseSpreadsheet = (text: string) => {
  const workbook = XLSX.read(text, { type: "string" });
  const json_data = XLSX.utils.sheet_to_json(
    workbook.Sheets[Object.keys(workbook.Sheets)[0]],
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

  try {
    const jsonData = JSON.parse(textData) as ElementClipboardContext[];
    if (jsonData) {
      return {
        type: "nodes",
        data: jsonData,
      };
    }
  } catch {}

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

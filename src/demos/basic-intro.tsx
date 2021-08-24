import { DataManager } from "../data-manager";
import ProGraph from "../prograph";
import { csvToTable } from "../utils/files";

export default async function loadDemo(
  dataManager: DataManager,
): Promise<ProGraph> {
  const resp = await fetch("/employee-salaries.csv");
  const data = await resp.text();

  const graph = await dataManager.newGraph();
  graph.name = "DEMO: The Basics";

  const table = csvToTable(data);

  const tableId = await dataManager.newTable(table, "employee-salaries.csv");

  const tableNodeId = graph.addNode({
    type: "DataTable",
    sources: {
      docId: tableId,
      label: "Employee Salaries",
    },
    position: { x: 100, y: -100 },
  });

  const groupNodeId = graph.addNode({
    type: "Group",
    sources: {
      columnSelections: [
        {
          aggregateFunction: "SUM",
          columnAccessor: table.columns.find((col) =>
            col.Header.includes("Base"),
          ).accessor,
        },
      ],
      groupColumns: [
        table.columns.find((col) => col.Header.includes("Location")).accessor,
      ],
    },
    position: { x: 0, y: 20 },
  });

  const tableViewerNodeId = graph.addNode({
    type: "TableViewer",
    size: {
      width: 420,
      height: 380,
    },
    position: { x: -40, y: 260 },
  });

  graph.addEdge({
    from: {
      nodeId: tableNodeId,
      busKey: "table",
    },
    to: {
      nodeId: groupNodeId,
      busKey: "table",
    },
  });

  graph.addEdge({
    from: {
      nodeId: groupNodeId,
      busKey: "table",
    },
    to: {
      nodeId: tableViewerNodeId,
      busKey: "table",
    },
  });

  return graph;
}

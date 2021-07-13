import { nanoid } from "nanoid";

export function jsonToTable(json_data: any[]) {
  const columns = Object.keys(json_data.length ? json_data[0] : {}).map(
    (col) => ({
      Header: col,
      accessor: nanoid(),
    }),
  );

  const columnIndex = Object.fromEntries(
    columns.map((c, i) => [c.Header, c.accessor]),
  );

  const rows = json_data.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([header, val]) => [columnIndex[header], val]),
    ),
  );

  return {
    columns,
    rows,
  };
}

export function matrixToTable(matrix_data: string[][]) {
  const [colData, ...rowData] = matrix_data;

  const columns = colData.map((col) => ({
    Header: col,
    accessor: nanoid(),
  }));

  const rows = rowData.map((row) =>
    Object.fromEntries(row.map((val, i) => [colData[i], val])),
  );

  return {
    columns,
    rows,
  };
}

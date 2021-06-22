export function jsonToTable(json_data: any[]) {
  const cols = Object.keys(json_data.length ? json_data[0] : {}).map((col) => ({
    Header: col,
    accessor: col,
  }));

  return {
    columns: cols,
    rows: json_data,
  };
}

export function matrixToTable(matrix_data: string[][]) {
  const [colData, ...rowData] = matrix_data;

  const columns = colData.map((col) => ({
    Header: col,
    accessor: col,
  }));

  const rows = rowData.map((row) =>
    Object.fromEntries(row.map((val, i) => [colData[i], val])),
  );

  return {
    columns,
    rows,
  };
}

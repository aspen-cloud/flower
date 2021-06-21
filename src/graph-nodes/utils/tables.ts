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

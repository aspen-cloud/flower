import { nanoid } from "nanoid";
import { Column, ColumnType, RowValue, Table } from "../types";
import columnParsers from "../column-parsers";

export function jsonToTable(json_data: Record<string, any>[]): Table {
  const columns: Column[] = Object.keys(
    json_data.length ? json_data[0] : {},
  ).map((col) => ({
    Header: col,
    accessor: nanoid(),
    Type: { name: "Text" }, // TODO: hard coded as obj
  }));

  const columnIndex = Object.fromEntries(columns.map((c, i) => [c.Header, c]));

  const rows = json_data.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([header, val]) => [
        columnIndex[header].accessor,
        parseRow(val.toString(), columnIndex[header].Type),
      ]),
    ),
  );

  return {
    columns,
    rows,
  };
}

export function matrixToTable(matrix_data: string[][]): Table {
  const [colData, ...rowData] = matrix_data;

  const columns = colData.map((col) => ({
    Header: col,
    accessor: nanoid(),
    Type: { name: "Text" }, // TODO: hard coded as obj
  }));

  const rows = rowData.map((row) =>
    Object.fromEntries(
      row.map((val, i) => [
        columns[i].accessor,
        parseRow(val, columns[i].Type),
      ]),
    ),
  );

  return {
    columns,
    rows,
  };
}

export function parseRow(value: string, typeDef: ColumnType): RowValue {
  const parser = columnParsers[typeDef.name];
  let readValue: string;
  let underlyingValue: any;
  let error: Error;
  try {
    const result = parser.parse(value);
    readValue = result.readValue;
    underlyingValue = result.underlyingValue;
  } catch (err) {
    error = err;
    readValue = value;
    console.log(err);
  }

  return {
    readValue,
    writeValue: value,
    underlyingValue,
    error,
  };
}

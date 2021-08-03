import { nanoid } from "nanoid";
import { Column, RowValue, Table } from "../types";
import { parseNumber, columnTypes } from "../column-parsers";

export function jsonToTable(json_data: Record<string, any>[]): Table {
  const columns: Column[] = Object.entries(
    json_data.length ? json_data[0] : {},
  ).map(([col, value]) => ({
    Header: col,
    accessor: nanoid(),
    Type: inferType(value),
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

  const types = rowData.length
    ? rowData[0].map((val) => inferType(val))
    : new Array(colData.length).fill("Text");

  const columns = colData.map((col, i) => ({
    Header: col,
    accessor: nanoid(),
    Type: types[i],
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

export function parseRow(value: string, typeKey: string): RowValue {
  const columnType = columnTypes[typeKey];
  let readValue: string;
  let writeValue: string;
  let underlyingValue: any;
  let error: Error;
  try {
    const result = columnType.parse(value);
    readValue = result.readValue;
    writeValue = result.writeValue;
    underlyingValue = result.underlyingValue;
  } catch (err) {
    error = err;
    readValue = value;
    writeValue = value;
    console.log(err);
  }

  return {
    readValue,
    writeValue,
    underlyingValue,
    error: error?.message,
  };
}

function inferType(val: string) {
  if (val) {
    if (val.startsWith("$")) {
      const parsedNumber = parseNumber(val.substring(1));
      if (!isNaN(parsedNumber)) return "Currency";
    } else if (val.endsWith("%")) {
      const parsedNumber = parseNumber(val.substring(0, val.length - 1));
      if (!isNaN(parsedNumber)) return "Percentage";
    }

    const parsedNumber = parseNumber(val);
    if (!isNaN(parsedNumber)) return "Number";
  }

  return "Text";
}

import { nanoid } from "nanoid";
import { Column, ColumnType, RowValue, Table } from "../types";
import columnParsers, { parseNumber } from "../column-parsers";

export function jsonToTable(json_data: Record<string, any>[]): Table {
  const columns: Column[] = Object.entries(
    json_data.length ? json_data[0] : {},
  ).map(([col, value]) => ({
    Header: col,
    accessor: nanoid(),
    Type: { name: inferType(value) }, // TODO: hard coded as obj
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
    Type: { name: types[i] },
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

// TODO: update write value on paste
export function parseRow(value: string, typeDef: ColumnType): RowValue {
  const parser = columnParsers[typeDef.name];
  let readValue: string;
  let writeValue: string;
  let underlyingValue: any;
  let error: Error;
  try {
    const result = parser.parse(value);
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
    error,
  };
}

// TODO: do better
export function inferType(val: string) {
  // if (val.match(/(?=.*?\d)^\$?(([1-9]\d{0,2}(,\d{3})*)|\d+)?(\.\d{1,2})?$/))
  //   return "Currency";
  // if (val.match(/\\d+(?:\\.\\d+)?%/)) return "Percentage";
  // if (!isNaN(Number(val))) return "Number";
  console.log(val);
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

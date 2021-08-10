import { nanoid } from "nanoid";
import { Column, RowValue, Table } from "../types";
import { parseNumber, columnTypes } from "../column-parsers";

export function jsonToTable(json_data: Record<string, any>[]): Table {
  const newColumn = (colName: string, colValue: any): Column => ({
    Header: colName,
    accessor: nanoid(),
    Type: inferType(colValue),
  });

  // Build columns as we read rows since rows may come in sparse
  const columnIndex: Record<string, Column> = {};
  const rows: Record<string, RowValue>[] = [];
  json_data.forEach((r) => {
    const row: Record<string, RowValue> = {};
    Object.entries(r).forEach(([header, val]) => {
      if (!(header in columnIndex))
        columnIndex[header] = newColumn(header, val);
      row[columnIndex[header].accessor] = parseRow(
        val.toString(),
        columnIndex[header].Type,
      );
    });
    rows.push(row);
  });

  const columns = Object.values(columnIndex);

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

export function inferType(val: string) {
  if (val) {
    if (typeof val === "number") return "Number";
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

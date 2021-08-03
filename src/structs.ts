import {
  object,
  defaulted,
  array,
  Describe,
  string,
  record,
  unknown,
  define,
  optional,
  is,
} from "superstruct";
import { Column, RowValue, Table } from "./types";

const ErrorStruct = () =>
  define<Error>("error", (value) => value instanceof Error);

const RowValueStruct: Describe<RowValue> = object({
  readValue: string(),
  writeValue: string(),
  underlyingValue: unknown(),
  error: optional(ErrorStruct()),
});

// TODO: determine if we would like to "Describe" or "Infer" types
const ColumnStruct: Describe<Column> = object({
  Header: string(),
  accessor: string(),
  Type: string(),
});

const TableStructInternal: Describe<Table> = object({
  columns: defaulted(array(ColumnStruct), []),
  rows: defaulted(array(record(string(), RowValueStruct)), []),
});

export const TableStruct = define<Table>("table", (value) =>
  is(value, TableStructInternal),
);

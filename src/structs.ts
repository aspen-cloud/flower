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
} from "superstruct";
import { Column, ColumnType, RowValue, Table } from "./types";

const ErrorStruct = () =>
  define<Error>("error", (value) => value instanceof Error);

const ColumnTypeStruct: Describe<ColumnType> = object({
  name: string(),
});

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
  Type: ColumnTypeStruct,
});

export const TableStruct: Describe<Table> = object({
  columns: defaulted(array(ColumnStruct), []),
  rows: defaulted(array(record(string(), RowValueStruct)), []),
});

import { object, defaulted, array, Describe, string } from "superstruct";
import { Column, Table } from "./types";

// TODO: determine if we would like to "Describe" or "Infer" types
const ColumnStruct: Describe<Column> = object({
  Header: string(),
  accessor: string(),
});

export const TableStruct: Describe<Table<any>> = object({
  columns: defaulted(array(ColumnStruct), []),
  rows: defaulted(array(), []),
});

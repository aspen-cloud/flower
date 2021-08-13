import { z } from "zod";

export const STRING = z.string().default("");

export const NUMBER = z.number().default(0);

const ColumnSchema = z.object({
  accessor: z.string(),
  type: z.string(),
  Header: z.string(),
});

const RowSchema = z.object({
  readValue: z.string(),
  writeValue: z.string(),
  underlyingValue: z.unknown(),
  error: z.string().optional(),
});

export const TABLE = z
  .object({
    columns: z.array(ColumnSchema),
    rows: z.array(z.record(RowSchema)),
  })
  .default({ rows: [], columns: [] });

export const FUNCTION = z
  .function()
  .args(z.unknown())
  .returns(z.unknown())
  .default((val) => val);

export type AnyValueSchemas =
  | typeof STRING
  | typeof NUMBER
  | typeof TABLE
  | typeof FUNCTION;

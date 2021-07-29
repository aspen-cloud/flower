import { useMemo } from "react";
import { any, object, array, defaulted } from "superstruct";
import BaseNode from "../../../components/base-node";
import { RowValue } from "../../../types";
import DataTable from "../../nodes/standard/table-node/data-table";

const Viewer = {
  inputs: {
    value: any(),
  },
  outputs: {
    value: ({ value }) => value,
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Inspector" sources={inputs} sinks={outputs}>
        <div>{JSON.stringify(outputs.value)}</div>
      </BaseNode>
    );
  },
};

const TableViewer = {
  inputs: {
    table: defaulted(
      object({
        rows: array(),
        columns: array(),
      }),
      () => ({ rows: [], columns: [] }),
    ),
  },
  outputs: {
    table: ({ table }) => table,
  },
  Component: ({ data }) => {
    const { inputs, outputs } = data;

    // Docs say to memoize these values
    const columnsMemo = useMemo(
      () => inputs.table.columns ?? [],
      [inputs.table.columns],
    );
    const dataMemo = useMemo(
      () =>
        (inputs.table.rows ?? []).map((row: Record<string, RowValue>) =>
          Object.fromEntries(
            Object.entries(row).map(([key, val]) => [key, val.readValue]),
          ),
        ),
      [inputs.table.rows],
    );

    return (
      <BaseNode label="Table Explorer" sources={inputs} sinks={outputs}>
        <DataTable data={dataMemo} columns={columnsMemo} />
      </BaseNode>
    );
  },
};

export default {
  Viewer,
  TableViewer,
};

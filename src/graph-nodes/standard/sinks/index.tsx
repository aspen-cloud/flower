import { useMemo } from "react";
import { any, object, array, defaulted } from "superstruct";
import BaseNode from "../../../components/base-node";
import { NodeClass } from "../../../prograph";
import { TableStruct } from "../../../structs";
import { RowValue } from "../../../types";
import DataTable from "../../nodes/standard/table-node/data-table";

const Viewer: NodeClass = {
  inputs: {
    value: any(),
  },
  sources: {},
  outputs: {
    value: { func: ({ value }) => value, struct: any() },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Inspector" sources={inputs} sinks={outputs}>
        <div>{JSON.stringify(outputs.value)}</div>
      </BaseNode>
    );
  },
};

const TableViewer: NodeClass = {
  inputs: {
    table: defaulted(TableStruct, () => ({ rows: [], columns: [] })),
  },
  sources: {},
  outputs: {
    table: { func: ({ table }) => table, struct: TableStruct },
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

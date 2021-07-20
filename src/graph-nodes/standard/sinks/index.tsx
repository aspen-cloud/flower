import { any, object, array, defaulted } from "superstruct";
import BaseNode from "../../../base-node";
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
      <BaseNode sources={inputs} sinks={outputs}>
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
      () => ({ rows: [], columns: [] })
    ),
  },
  outputs: {
    table: ({ table }) => table,
  },
  Component: ({ data }) => {
    const { inputs, outputs } = data;
    const table = outputs.table || { rows: [], columns: [] };
    return (
      <BaseNode sources={inputs} sinks={outputs}>
        <DataTable data={table.rows} columns={table.columns} />
      </BaseNode>
    );
  },
};

export default {
  Viewer,
  TableViewer,
};

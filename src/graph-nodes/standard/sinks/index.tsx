import { useMemo } from "react";
import { Column } from "react-table";
import { any, object, array, defaulted } from "superstruct";
import BaseNode from "../../../components/base-node";
import ResizableNode from "../../../components/resizable-node";
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
  Component: ({ data, id, size, selected }) => {
    const { inputs, outputs } = data;

    return (
      <ResizableNode
        label="Table Explorer"
        sources={inputs}
        sinks={outputs}
        nodeId={id}
        height={size?.height || 300}
        width={size?.width || 300}
        className={selected ? "nowheel" : ""}
      >
        <DataTable table={inputs.table} />
      </ResizableNode>
    );
  },
};

export default {
  Viewer,
  TableViewer,
};

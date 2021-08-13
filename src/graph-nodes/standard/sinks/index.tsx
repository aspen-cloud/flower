import BaseNode from "../../../components/base-node";
import ResizableNode from "../../../components/resizable-node";
import { registerNode, ValueTypes } from "../../../node-type-manager";
import DataTable from "./data-table";

const Viewer = registerNode({
  inputs: {
    value: ValueTypes.ANY,
  },
  sources: {},
  outputs: {
    value: { func: ({ value }) => value, returns: ValueTypes.ANY },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Inspector" sources={inputs} sinks={outputs}>
        <div>{JSON.stringify(outputs.value)}</div>
      </BaseNode>
    );
  },
});

const TableViewer = registerNode({
  inputs: {
    table: ValueTypes.TABLE,
  },
  sources: {},
  outputs: {
    table: { func: ({ table }) => table, returns: ValueTypes.TABLE },
  },
  Component: ({
    data: {
      inputs,
      outputs,
      metadata: { size },
    },
    id,
    selected,
  }) => {
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
});

export default {
  Viewer,
  TableViewer,
};

import React from "react";
import BaseNode from "../base-node";
import createPrimitiveNodeData from "./nodes/primitives";
import * as SubtractIO from "./nodes/primitives/numbers/subtract";

export { default as DataSource } from "./nodes/datasource-node";
export { default as ColumnGenerator } from "./nodes/standard/column-generator-node";
export { default as Table } from "./nodes/standard/table-node";
export { default as AvgColumn } from "./nodes/standard/avg-column-node";
export { default as SingleCell } from "./nodes/standard/single-cell-node";
export { default as Constant } from "./nodes/standard/constant-node";

const Substract = {
  initializeStreams: ({ initialData }) => {
    return createPrimitiveNodeData(SubtractIO.inputs, SubtractIO.outputs);
  },
  Component({ data: { sources, sinks } }) {
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <div style={{ backgroundColor: "white" }}>Substract</div>
      </BaseNode>
    );
  }
};

export { Substract };

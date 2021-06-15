import { constant, Property } from "kefir";
import React from "react";
import { Handle } from "react-flow-renderer";
import BaseNode from "../../base-node";
import { GraphNode, Table } from "../../types";

interface DatasourceNodeIO {
  sources: {};
  sinks: {
    output: Property<Table<any>, void>;
  };
}

const DataSourceNode: GraphNode<DatasourceNodeIO> = {
  initializeStreams: function ({ initialData }): DatasourceNodeIO {
    console.log("initializing datasource with", initialData);
    return {
      sources: {},
      sinks: {
        output: constant(initialData)
      }
    };
  },

  Component: function ({
    data: { sources, sinks }
  }: {
    data: DatasourceNodeIO;
  }) {
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <img
          style={{
            userDrag: "none",
            userSelect: "none",
            pointerEvents: "none"
          }}
          width="50px"
          src="/database.svg"
        />
        <Handle position="bottom" type="source" />
      </BaseNode>
    );
  }
};

export default DataSourceNode;

import { constant, Property } from "kefir";
import React, { useEffect, useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import BaseNode from "../../base-node";
import { GraphNode, Table } from "../../types";

interface DatasourceNodeIO {
  sources: {
    label: Property<string, void>;
  };
  sinks: {
    output: Property<Table<any>, void>;
  };
}

// @ts-ignore
const DataSourceNode: GraphNode<DatasourceNodeIO> = {
  initializeStreams: function ({ initialData }): DatasourceNodeIO {
    console.log("initializing datasource with", initialData);
    return {
      sources: {
        label: constant(initialData.label),
      },
      sinks: {
        output: constant(initialData.data),
      },
    };
  },

  Component: function ({
    data: { sources, sinks },
  }: {
    data: DatasourceNodeIO;
  }) {
    const [label, setLabel] = useState("");
    useEffect(() => {
      sources.label.observe((value) => {
        setLabel(value);
      });
    }, []);
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <figure style={{ textAlign: "center" }}>
          <img
            style={{
              // @ts-ignore
              userDrag: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
            width="50px"
            src="/database.svg"
          />
          <figcaption style={{ backgroundColor: "#dedede", padding: "0 1em" }}>
            {label}
          </figcaption>
        </figure>
        <Handle position={Position.Bottom} type="source" />
      </BaseNode>
    );
  },
};

export default DataSourceNode;

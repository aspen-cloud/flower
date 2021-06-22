import React, { useEffect, useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import BaseNode from "../../base-node";
import { GraphNode, Table } from "../../types";
import { BehaviorSubject } from "rxjs";

interface DatasourceNodeIO {
  sources: {
    label: BehaviorSubject<string>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

const DataSourceNode: GraphNode<DatasourceNodeIO> = {
  initializeStreams: function ({ initialData }): DatasourceNodeIO {
    console.log("initializing datasource with", initialData);
    return {
      sources: {
        label: new BehaviorSubject(initialData.label), // constant(initialData.label)
      },
      sinks: {
        output: new BehaviorSubject(initialData.data), // constant(initialData.data)
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
      const subscription = sources.label.subscribe(setLabel);
      return () => subscription.unsubscribe();
    }, []);
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <figure style={{ textAlign: "center" }}>
          <img
            style={{
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

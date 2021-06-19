import { Property } from "kefir";
import KefirBus from "../../../utils/kefir-bus";
import React, { useEffect, useState } from "react";
import { GraphNode, Table } from "../../types";
import BaseNode from "../../../base-node";

interface SingleCellNodeIO {
  sources: {
    value: KefirBus<string | number, void>;
  };
  sinks: {
    output: Property<Table, void>;
  };
}

const SingleCellNode: GraphNode<SingleCellNodeIO> = {
  initializeStreams: function ({ initialData }): SingleCellNodeIO {
    const value = new KefirBus<string | number, void>("value");
    return {
      sources: {
        value
      },
      sinks: {
        output: value.stream.toProperty()
      }
    };
  },

  Component: function ({ data }: { data: SingleCellNodeIO }) {
    const [value, setValue] = useState("Single Value");
    useEffect(() => {
      const { unsubscribe } = data.sources.value.stream.observe({
        value(val) {
          setValue(val);
        }
      });
      return unsubscribe;
    }, []);
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <h2 style={{ backgroundColor: "white" }}>{JSON.stringify(value)}</h2>
      </BaseNode>
    );
  }
};

export default SingleCellNode;

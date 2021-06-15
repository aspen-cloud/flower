import { Property } from "kefir";
import KefirBus from "../../../utils/kefir-bus";
import React, { useEffect, useState } from "react";
import { GraphNode, Table } from "../../types";
import BaseNode from "../../../base-node";

interface ConstantNodeIO {
  sources: {
    value: KefirBus<string | number, void>;
  };
  sinks: {
    output: Property<Table, void>;
  };
}

const ConstantNode: GraphNode<ConstantNodeIO> = {
  initializeStreams: function ({ initialData }): ConstantNodeIO {
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

  Component: function ({ data }: { data: ConstantNodeIO }) {
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
        <input
          value={value}
          onChange={(e) => data.sources.value.emit(e.target.value)}
        />
      </BaseNode>
    );
  }
};

export default ConstantNode;

import React, { useEffect, useState } from "react";
import { GraphNode, Table } from "../../../types";
import BaseNode from "../../../base-node";
import { BehaviorSubject, Observable } from "rxjs";
import { shareReplay, tap } from "rxjs/operators";

interface ConstantNodeIO {
  sources: {
    value: BehaviorSubject<any>;
  };
  sinks: {
    output: BehaviorSubject<any>;
  };
}

const ConstantNode: GraphNode<ConstantNodeIO> = {
  initializeStreams: function ({
    initialData,
  }: {
    initialData: any;
  }): ConstantNodeIO {
    const value = new BehaviorSubject(initialData?.value || "");
    return {
      sources: {
        value,
      },
      sinks: {
        output: value,
      },
    };
  },

  persist: true,

  Component: function ({ data }: { data: ConstantNodeIO }) {
    const [value, setValue] = useState("Single Value");
    useEffect(() => {
      const subscription = data.sources.value.subscribe(setValue);
      return () => subscription.unsubscribe();
    }, []);
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <input
          value={value}
          onChange={(e) => data.sources.value.next(e.target.value)}
        />
      </BaseNode>
    );
  },
};

export default ConstantNode;

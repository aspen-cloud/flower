import React, { useEffect, useState, useRef } from "react";
import { Column, GraphNode, Table } from "../../types";
import BaseNode from "../../base-node";
import { BehaviorSubject, Observable } from "rxjs";
import { shareReplay, tap } from "rxjs/operators";

interface JoinNodeIO {
  sources: {
    tableA: BehaviorSubject<Table<any>>;
    tableB: BehaviorSubject<Table<any>>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

const JoinNode: GraphNode<JoinNodeIO> = {
  initializeStreams: function ({
    initialData,
  }: {
    initialData: any;
  }): JoinNodeIO {
    const tableA = new BehaviorSubject(
      initialData?.tableA || { columns: [], rows: [] },
    );
    const tableB = new BehaviorSubject(
      initialData?.tableB || { columns: [], rows: [] },
    );
    const output = new BehaviorSubject({ columns: [], rows: [] });
    return {
      sources: {
        tableA,
        tableB,
      },
      sinks: {
        output,
      },
    };
  },

  persist: true,

  Component: function ({ data }: { data: JoinNodeIO }) {
    const [tableA, setTableA] = useState({ columns: [], rows: [] });
    const [tableB, setTableB] = useState({ columns: [], rows: [] });

    const [joinColumnA, setJoinColumnA] = useState("");
    const [joinColumnB, setJoinColumnB] = useState("");

    useEffect(() => {
      const tableASubscription = data.sources.tableA.subscribe(setTableA);
      return () => tableASubscription.unsubscribe();
    }, [data.sources.tableA]);

    useEffect(() => {
      const tableBSubscription = data.sources.tableB.subscribe(setTableB);
      return () => tableBSubscription.unsubscribe();
    }, [data.sources.tableB]);

    useEffect(() => {
      const columns = tableA.columns.concat(tableB.columns);

      const rowsA = joinColumnA ? tableA.rows : [];
      const rowsB = joinColumnB ? tableB.rows : [];
      const rows = rowsA.map((rowA) => ({
        ...rowA,
        ...(rowsB.find((rowB) => rowA[joinColumnA] === rowB[joinColumnB]) ||
          {}),
      }));

      data.sinks.output.next({ columns, rows });
    }, [tableA, tableB, joinColumnA, joinColumnB, data.sinks.output]);

    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <div>
          <label>A column</label>
          <select
            value={joinColumnA}
            onChange={(e) => setJoinColumnA(e.target.value)}
          >
            {[
              <option disabled selected value={""}>
                {" "}
                -- select a column --{" "}
              </option>,
              ...tableA.columns.map((c) => (
                <option value={c.accessor}>{c.accessor}</option>
              )),
            ]}
          </select>
        </div>
        <div>
          <label>B column</label>
          <select
            value={joinColumnB}
            onChange={(e) => setJoinColumnB(e.target.value)}
          >
            {[
              <option disabled selected value={""}>
                {" "}
                -- select a column --{" "}
              </option>,
              ...tableB.columns.map((c) => (
                <option value={c.accessor}>{c.accessor}</option>
              )),
            ]}
          </select>
        </div>
      </BaseNode>
    );
  },
};

export default JoinNode;

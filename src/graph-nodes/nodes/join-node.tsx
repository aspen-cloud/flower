import React, { useEffect, useState } from "react";
import { GraphNode, Table } from "../../types";
import BaseNode from "../../base-node";
import { BehaviorSubject } from "rxjs";

interface JoinNodeIO {
  sources: {
    tableA: BehaviorSubject<Table<any>>;
    tableB: BehaviorSubject<Table<any>>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

/**
 * TODO:
 * multiple join cases for a join
 * join mulitple tables
 * Improved aliasing
 * Select specific columns for next view
 */
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

    // TODO: labels could be passed down with table object
    const [labelA, setLabelA] = useState("");
    const [labelB, setLabelB] = useState("");

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
      const safeLabelA = labelA || "A";
      const safeLabelB = labelB || "B";

      if (safeLabelA === safeLabelB) {
        data.sinks.output.next({ columns: [], rows: [] });
        return;
      }

      const columnRenameIndexA = Object.fromEntries(
        tableA.columns.map((col) => [
          col.accessor,
          `${safeLabelA}-${col.accessor}`,
        ]),
      );
      const columnRenameIndexB = Object.fromEntries(
        tableB.columns.map((col) => [
          col.accessor,
          `${safeLabelB}-${col.accessor}`,
        ]),
      );
      const columns = tableA.columns
        .map((col) => ({
          accessor: columnRenameIndexA[col.accessor],
          Header: columnRenameIndexA[col.accessor],
        }))
        .concat(
          tableB.columns.map((col) => ({
            accessor: columnRenameIndexB[col.accessor],
            Header: columnRenameIndexB[col.accessor],
          })),
        );

      const rowsA = joinColumnA ? tableA.rows : [];
      const rowsB = joinColumnB ? tableB.rows : [];

      const rows = rowsA.map((rowA) => ({
        ...Object.fromEntries(
          Object.entries(rowA).map(([key, val]) => [
            columnRenameIndexA[key],
            val,
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(
            rowsB.find((rowB) => rowA[joinColumnA] === rowB[joinColumnB]) || {},
          ).map(([key, val]) => [columnRenameIndexB[key], val]),
        ),
      }));

      data.sinks.output.next({ columns, rows });
    }, [
      tableA,
      tableB,
      joinColumnA,
      joinColumnB,
      labelA,
      labelB,
      data.sinks.output,
    ]);

    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <div
          style={{
            backgroundColor: "white",
            padding: "1em",
            display: "flex",
            flexDirection: "row",
          }}
        >
          <div>
            <h3>TableA</h3>
            <div>
              <label>Label:</label>{" "}
              <input
                value={labelA}
                onChange={(e) => setLabelA(e.target.value)}
              />
            </div>
            <div>
              <label>Join on:</label>{" "}
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
          </div>
          <div>
            <h3>TableB</h3>
            <div>
              <label>Label:</label>{" "}
              <input
                value={labelB}
                onChange={(e) => setLabelB(e.target.value)}
              />
            </div>
            <div>
              <label>Join on:</label>{" "}
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
          </div>
        </div>
      </BaseNode>
    );
  },
};

export default JoinNode;

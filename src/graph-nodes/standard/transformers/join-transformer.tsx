import { defaulted, string } from "superstruct";
import { useCallback, useMemo, useState } from "react";
import BaseNode from "../../../base-node";
import { TableStruct } from "../../../structs";
import DirtyInput from "../../../dirty-input";
import { nanoid } from "nanoid";
import { Column } from "../../../types";
import { flowMemo } from "../../../utils/memo";

const Join = {
  inputs: {
    tableA: defaulted(TableStruct, {}),
    tableB: defaulted(TableStruct, {}),
  },
  sources: {
    labelA: defaulted(string(), ""),
    labelB: defaulted(string(), ""),
    joinColumnA: defaulted(string(), ""),
    joinColumnB: defaulted(string(), ""),
  },
  outputs: {
    table: () => {
      const calcColumns = flowMemo(
        ({ ...args }): Column[] => {
          const safeLabelA = args.labelA || "A";
          const safeLabelB = args.labelB || "B";

          if (safeLabelA === safeLabelB) {
            return [];
          }

          console.log("new cols");
          return args.tableA.columns
            .map((col) => ({
              accessor: col.accessor || nanoid(),
              Header: `${safeLabelA}-${col.Header}`,
            }))
            .concat(
              args.tableB.columns.map((col) => ({
                accessor: col.accessor || nanoid(),
                Header: `${safeLabelB}-${col.Header}`,
              })),
            );
        },
        ["labelA", "labelB", "tableA", "tableB"],
      );

      const calcRows = flowMemo(
        ({ ...args }): any[] => {
          const rowsA = args.joinColumnA ? args.tableA.rows : [];
          const rowsB = args.joinColumnB ? args.tableB.rows : [];

          console.log("new rows");
          return rowsA.map((rowA) => ({
            ...rowA,
            ...(rowsB.find(
              (rowB) => rowA[args.joinColumnA] === rowB[args.joinColumnB],
            ) || {}),
          }));
        },
        ["joinColumnA", "joinColumnB", "tableA", "tableB"],
      );

      return ({ tableA, tableB, labelA, labelB, joinColumnA, joinColumnB }) => {
        const columns = calcColumns({
          tableA,
          tableB,
          labelA,
          labelB,
          joinColumnA,
          joinColumnB,
        });
        const rows = calcRows({
          tableA,
          tableB,
          labelA,
          labelB,
          joinColumnA,
          joinColumnB,
        });
        return { columns, rows };
      };
    },
  },
  Component: ({ data }) => {
    // TODO: labels could be passed down with table object
    const setLabelA = useCallback(
      (newLabel) => {
        data.sources.labelA.set(newLabel);
      },
      [data.sources.labelA],
    );

    const setLabelB = useCallback(
      (newLabel) => {
        data.sources.labelB.set(newLabel);
      },
      [data.sources.labelB],
    );

    const joinColumnA = useMemo(
      () => data.sources.joinColumnA.value,
      [data.sources.joinColumnA],
    );
    const setJoinColumnA = useCallback(
      (newColumn) => {
        data.sources.joinColumnA.set(newColumn);
      },
      [data.sources.joinColumnA],
    );

    const joinColumnB = useMemo(
      () => data.sources.joinColumnB.value,
      [data.sources.joinColumnB],
    );
    const setJoinColumnB = useCallback(
      (newColumn) => {
        data.sources.joinColumnB.set(newColumn);
      },
      [data.sources.joinColumnB],
    );

    const tableAColumnsOptions = useMemo(
      () => [
        <option disabled selected value={""}>
          {" "}
          -- select a column --{" "}
        </option>,
        ...data.inputs.tableA.columns.map((c) => (
          <option key={c.accessor} value={c.accessor}>
            {c.Header}
          </option>
        )),
      ],
      [data.inputs.tableA.columns],
    );

    const tableBColumnsOptions = useMemo(
      () => [
        <option disabled selected value={""}>
          {" "}
          -- select a column --{" "}
        </option>,
        ...data.inputs.tableB.columns.map((c) => (
          <option key={c.accessor} value={c.accessor}>
            {c.Header}
          </option>
        )),
      ],
      [data.inputs.tableB.columns],
    );

    return (
      <BaseNode sources={data.inputs} sinks={data.outputs}>
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
              <label>
                Label:
                <DirtyInput
                  onConfirm={(value) => setLabelA(value)}
                  value={data.sources.labelA.value}
                />
              </label>
            </div>
            <div>
              <label>
                Join on:
                <select
                  value={joinColumnA}
                  onChange={(e) => setJoinColumnA(e.target.value)}
                >
                  {tableAColumnsOptions}
                </select>
              </label>
            </div>
          </div>
          <div>
            <h3>TableB</h3>
            <div>
              <label>
                Label:
                <DirtyInput
                  onConfirm={(value) => setLabelB(value)}
                  value={data.sources.labelB.value}
                />
              </label>
            </div>
            <div>
              <label>
                Join on:
                <select
                  value={joinColumnB}
                  onChange={(e) => setJoinColumnB(e.target.value)}
                >
                  {tableBColumnsOptions}
                </select>
              </label>
            </div>
          </div>
        </div>
      </BaseNode>
    );
  },
};

export default Join;

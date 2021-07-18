import { any, array, enums, object, string } from "superstruct";
import { useEffect, useState } from "react";
import BaseNode from "../../../base-node";

const Join = {
  inputs: {
    tableA: any(),
    tableB: any(),
  },
  sources: {
    labelA: string(),
    labelB: string(),
    joinColumnA: string(),
    joinColumnB: string(),
  },
  outputs: {
    table: ({ tableA, tableB, labelA, labelB, joinColumnA, joinColumnB }) => {
      const tblA = tableA || { columns: [], rows: [] };
      const tblB = tableB || { columns: [], rows: [] };

      const safeLabelA = labelA || "A";
      const safeLabelB = labelB || "B";

      if (safeLabelA === safeLabelB) {
        return { columns: [], rows: [] };
      }

      const columnRenameIndexA = Object.fromEntries(
        tblA.columns.map((col) => [
          col.accessor,
          `${safeLabelA}-${col.Header}`,
        ]),
      );
      const columnRenameIndexB = Object.fromEntries(
        tblB.columns.map((col) => [
          col.accessor,
          `${safeLabelB}-${col.Header}`,
        ]),
      );
      const columns = tblA.columns
        .map((col) => ({
          accessor: columnRenameIndexA[col.accessor],
          Header: columnRenameIndexA[col.accessor],
        }))
        .concat(
          tblB.columns.map((col) => ({
            accessor: columnRenameIndexB[col.accessor],
            Header: columnRenameIndexB[col.accessor],
          })),
        );

      const rowsA = joinColumnA ? tblA.rows : [];
      const rowsB = joinColumnB ? tblB.rows : [];

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

      return { columns, rows };
    },
  },
  Component: ({ data }) => {
    // TODO: labels could be passed down with table object
    const [labelA, setLabelA] = useState(data.sources.labelA?.value || "");
    useEffect(() => {
      data.sources.labelA.set(labelA);
    }, [labelA, data.sources.labelA]);
    const [labelB, setLabelB] = useState(data.sources.labelB?.value || "");
    useEffect(() => {
      data.sources.labelB.set(labelB);
    }, [labelB, data.sources.labelB]);

    const [joinColumnA, setJoinColumnA] = useState(
      data.sources.joinColumnA?.value || "",
    );
    useEffect(() => {
      data.sources.joinColumnA.set(joinColumnA);
    }, [joinColumnA, data.sources.joinColumnA]);
    const [joinColumnB, setJoinColumnB] = useState(
      data.sources.joinColumnB?.value || "",
    );
    useEffect(() => {
      data.sources.joinColumnB.set(joinColumnB);
    }, [joinColumnB, data.sources.joinColumnB]);

    const tableA = data.inputs.tableA || { columns: [], rows: [] };
    const tableB = data.inputs.tableB || { columns: [], rows: [] };

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
                <input
                  value={labelA}
                  onChange={(e) => setLabelA(e.target.value)}
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
                  {[
                    <option disabled selected value={""}>
                      {" "}
                      -- select a column --{" "}
                    </option>,
                    ...tableA.columns.map((c) => (
                      <option key={c.accessor} value={c.accessor}>
                        {c.Header}
                      </option>
                    )),
                  ]}
                </select>
              </label>
            </div>
          </div>
          <div>
            <h3>TableB</h3>
            <div>
              <label>
                Label:
                <input
                  value={labelB}
                  onChange={(e) => setLabelB(e.target.value)}
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
                  {[
                    <option disabled selected value={""}>
                      {" "}
                      -- select a column --{" "}
                    </option>,
                    ...tableB.columns.map((c) => (
                      <option key={c.accessor} value={c.accessor}>
                        {c.Header}
                      </option>
                    )),
                  ]}
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

import { defaulted, string } from "superstruct";
import { useCallback, useMemo } from "react";
import BaseNode from "../../../components/base-node";
import { TableStruct } from "../../../structs";
import DirtyInput from "../../../dirty-input";
import { NodeClass } from "../../../prograph";
import { Icon } from "@blueprintjs/core";
import { css } from "@emotion/css";

const Join: NodeClass = {
  inputs: {
    tableA: defaulted(TableStruct, () => ({ rows: [], columns: [] })),
    tableB: defaulted(TableStruct, () => ({ rows: [], columns: [] })),
  },
  sources: {
    labelA: defaulted(string(), ""),
    labelB: defaulted(string(), ""),
    joinColumnA: defaulted(string(), ""),
    joinColumnB: defaulted(string(), ""),
  },
  outputs: {
    table: {
      func: ({ tableA, tableB, labelA, labelB, joinColumnA, joinColumnB }) => {
        const safeLabelA = labelA || "A";
        const safeLabelB = labelB || "B";

        if (safeLabelA === safeLabelB) {
          return { columns: [], rows: [] };
        }

        const columnRenameIndexA = Object.fromEntries(
          tableA.columns.map((col) => [
            col.accessor,
            `${safeLabelA}_${col.Header}`,
          ]),
        );
        const columnRenameIndexB = Object.fromEntries(
          tableB.columns.map((col) => [
            col.accessor,
            `${safeLabelB}_${col.Header}`,
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
              rowsB.find(
                (rowB) =>
                  rowA[joinColumnA].underlyingValue ===
                  rowB[joinColumnB].underlyingValue,
              ) || {},
            ).map(([key, val]) => [columnRenameIndexB[key], val]),
          ),
        }));

        return { columns, rows };
      },
      struct: TableStruct,
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
      [data.sources.joinColumnA.value],
    );
    const setJoinColumnA = useCallback(
      (newColumn) => {
        data.sources.joinColumnA.set(newColumn);
      },
      [data.sources.joinColumnA],
    );

    const joinColumnB = useMemo(
      () => data.sources.joinColumnB.value,
      [data.sources.joinColumnB.value],
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
      <BaseNode label="Table Join" sources={data.inputs} sinks={data.outputs}>
        <div>
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <div>
              <h5 style={{ textAlign: "center" }}>Left Table</h5>
              <div>
                <label>
                  Label:
                  <DirtyInput
                    small
                    onConfirm={(value) => setLabelA(value)}
                    value={data.sources.labelA.value}
                  />
                </label>
              </div>
            </div>
            <div>
              <h5 style={{ textAlign: "center" }}>Right Table</h5>
              <div>
                <label>
                  Label:
                  <DirtyInput
                    small
                    onConfirm={(value) => setLabelB(value)}
                    value={data.sources.labelB.value}
                  />
                </label>
              </div>
            </div>
          </div>
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: space-evenly;
              padding: 10px;
            `}
          >
            <select
              value={joinColumnB}
              onChange={(e) => setJoinColumnB(e.target.value)}
            >
              {tableBColumnsOptions}
            </select>
            <Icon icon="equals" iconSize={24} />
            <select
              value={joinColumnA}
              onChange={(e) => setJoinColumnA(e.target.value)}
            >
              {tableAColumnsOptions}
            </select>
          </div>
        </div>
      </BaseNode>
    );
  },
};

export default Join;

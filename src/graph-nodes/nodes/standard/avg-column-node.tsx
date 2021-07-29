import React, { useEffect, useState } from "react";
import { Column, GraphNode, Table } from "../../../types";
import BaseNode from "../../../components/base-node";
import { BehaviorSubject, combineLatest } from "rxjs";
import { map } from "rxjs/operators";

interface AvgColumnNodeIO {
  sources: {
    table: BehaviorSubject<Table>;
    selectedColumn: BehaviorSubject<string>;
  };
  sinks: {
    output: BehaviorSubject<number>;
  };
}

const AvgColumnNode: GraphNode<AvgColumnNodeIO> = {
  initializeStreams: function () {
    const table = new BehaviorSubject({ columns: [], rows: [] } as Table);
    const selectedColumn = new BehaviorSubject("");
    return {
      sources: {
        table,
        selectedColumn,
      },
      sinks: {
        output: combineLatest(table, selectedColumn).pipe(
          map(([table, selectedColumn]) => {
            console.log(table, selectedColumn);
            const sum: number = table.rows.reduce(
              (sum, row) => sum + row[selectedColumn].underlyingValue,
              0,
            );
            const avg = sum / table.rows.length;

            return avg;
          }),
        ) as BehaviorSubject<number>,
      },
    };
  },
  Component: function ({ data }) {
    const [columns, setColumns] = useState<Column[]>([]);

    useEffect(() => {
      const subscription = data.sources.table.subscribe(({ columns }) =>
        setColumns(columns),
      );
      return () => subscription.unsubscribe();
    }, []);

    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <div style={{ backgroundColor: "white" }}>
          <div>Average a column</div>
          <select
            onChange={(e) => {
              data.sources.selectedColumn.next(e.target.value);
            }}
          >
            {columns.map((column) => (
              <option key={column.accessor} value={column.accessor}>
                {column.Header}
              </option>
            ))}
          </select>
        </div>
      </BaseNode>
    );
  },
};

export default AvgColumnNode;

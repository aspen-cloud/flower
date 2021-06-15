import { Property } from "kefir";
import React, { useEffect, useState } from "react";
import * as Kefir from "kefir";
import { Column, GraphNode, Table } from "../../../types";
import KefirBus from "../../../utils/kefir-bus";
import BaseNode from "../../../base-node";

interface AvgColumnNodeIO {
  sources: {
    table: KefirBus<Table<any>, void>;
    selectedColumn: KefirBus<string, void>;
  };
  sinks: {
    output: Property<number, void>;
  };
}

const AvgColumnNode: GraphNode<AvgColumnNodeIO> = {
  initializeStreams: function () {
    const table = new KefirBus<Table<any>, void>("table");
    const selectedColumn = new KefirBus<string, any>("selectedColumn");
    return {
      sources: {
        table,
        selectedColumn
      },
      sinks: {
        output: Kefir.combine([
          table.stream.toProperty(),
          selectedColumn.stream.toProperty()
        ])
          .toProperty()
          .map(([table, selectedColumn]) => {
            console.log(table, selectedColumn);
            const sum: number = table.rows.reduce(
              (sum, row) => sum + row[selectedColumn],
              0
            );
            const avg = sum / table.rows.length;
            console.log("avg", avg);
            return avg;
          })
          .toProperty()
      }
    };
  },
  Component: function ({ data }) {
    const [columns, setColumns] = useState<Column[]>([]);

    useEffect(() => {
      const subscription = data.sources.table.stream.observe({
        value(table: Table<any>) {
          setColumns(table.columns);
        }
      });
      return subscription.unsubscribe;
    }, []);

    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <div style={{ backgroundColor: "white" }}>
          <div>Average a column</div>
          <select
            onChange={(e) => {
              data.sources.selectedColumn.emit(e.target.value);
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
  }
};

export default AvgColumnNode;

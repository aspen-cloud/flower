import { Property } from "kefir";
import React from "react";
import { Handle } from "react-flow-renderer";
import * as Kefir from "kefir";
import KefirBus from "../../../../utils/kefir-bus";
import { GraphNode, Table } from "../../../../types";
import ColumnGeneratorForm from "./column-generator-form";
import BaseNode from "../../../../base-node";

interface ColumnGeneratorIO {
  sources: {
    table: KefirBus<Table, void>;
    columnName: KefirBus<string, void>;
    columnFormula: KefirBus<string, void>;
  };
  sinks: {
    output: Property<Table, void>;
  };
}

export default {
  initializeStreams: function () {
    const sources = {
      table: new KefirBus("table"),
      columnName: new KefirBus("columnName"),
      columnFormula: new KefirBus("table")
    };
    return {
      sources,
      sinks: {
        output: Kefir.combine<Table, [Table, string, string], void>([
          sources.table.stream.toProperty(),
          sources.columnName.stream.toProperty(),
          sources.columnFormula.stream.toProperty()
        ])
          .toProperty()
          .map(([table, columnName, columnFormula]) => {
            console.log(
              "mapping combined streams",
              table,
              columnName,
              columnFormula
            );
            const nextCol = `Col-${table.columns.length + 1}`;
            const newColumns = [
              ...table.columns,
              { Header: columnName || nextCol, accessor: columnName || nextCol }
            ];
            const newRows = table.rows.map((row) => ({
              ...row,
              [columnName]: applyExpr(row, columnFormula) || "null"
            }));

            return {
              rows: newRows,
              columns: newColumns
            };
          })
          .toProperty()
      }
    };
  },
  Component: function ({ data }) {
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <ColumnGeneratorForm
          colName="asdfasdf"
          colFormula=""
          onChange={({ colName, colFormula }) => {
            data.sources.columnName.emit(colName);
            data.sources.columnFormula.emit(colFormula);
          }}
        />
      </BaseNode>
    );
  }
} as GraphNode<ColumnGeneratorIO>;

function applyExpr(row, colExpr) {
  const enrichedExpr = colExpr
    .split(" ")
    .map((token) => {
      if (!["*", "-", "+", "/"].includes(token)) {
        return row[token];
      }
      return token;
    })
    .join(" ");
  try {
    return eval(enrichedExpr);
  } catch (e) {
    return "Err";
  }
}

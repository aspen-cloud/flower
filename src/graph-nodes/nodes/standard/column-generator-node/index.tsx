import React from "react";

import { GraphNode, Table } from "../../../../types";
import ColumnGeneratorForm from "./column-generator-form";
import BaseNode from "../../../../base-node";
import { nanoid } from "nanoid";
import { combineLatest, BehaviorSubject } from "rxjs";
import { map } from "rxjs/operators";

interface ColumnGeneratorIO {
  sources: {
    table: BehaviorSubject<Table<any>>;
    columnName: BehaviorSubject<string>;
    columnFormula: BehaviorSubject<string>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

export default {
  initializeStreams: function () {
    const sources = {
      table: new BehaviorSubject({ rows: [], columns: [] } as Table<any>),
      columnName: new BehaviorSubject(nanoid()),
      columnFormula: new BehaviorSubject(""),
    };
    return {
      sources,
      sinks: {
        output: combineLatest(
          sources.table,
          sources.columnName,
          sources.columnFormula,
        ).pipe(
          map(([table, columnName, columnFormula]) => {
            const newColumns = [
              ...table.columns,
              { Header: columnName, accessor: columnName },
            ];
            const newRows = table.rows.map((row) => ({
              ...row,
              [columnName]: applyExpr(row, columnFormula) || "null",
            }));

            return {
              rows: newRows,
              columns: newColumns,
            };
          }),
        ) as BehaviorSubject<Table<any>>,
      },
    };
  },
  Component: function ({ data }) {
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <ColumnGeneratorForm
          colName="asdfasdf"
          colFormula=""
          onChange={({ colName, colFormula }) => {
            data.sources.columnName.next(colName);
            data.sources.columnFormula.next(colFormula);
          }}
        />
      </BaseNode>
    );
  },
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

import { Property } from "kefir";
import React from "react";
import { Handle } from "react-flow-renderer";
import * as Kefir from "kefir";
import KefirBus from "../../../../utils/kefir-bus";
import { GraphNode, Table } from "../../../types";
import BaseNode from "../../../../base-node";
import filters from "./filters";
import FilterForm from "./filter-form";

/**
 * This is a super basic filter implementation that I'm merging for now
 *
 * Cool things we could do with filters:
 * - User defined filters
 * - Filtering based on primitive definitions (probably user defined)
 * - Multiple filters in one node
 * - AND OR XOR with multiple filters
 * - Two output streams: matches and non-matches
 * - Other recursive definitions / defining filters via nodes (instead of hard coded)
 */

interface FilterIO {
  sources: {
    table: KefirBus<Table, void>;
    columnName: KefirBus<string, void>;
    columnFilter: KefirBus<string, void>;
    compareValue: KefirBus<string, void>;
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
      columnFilter: new KefirBus("columnFilter"),
      compareValue: new KefirBus("compareValue")
    };
    return {
      sources,
      sinks: {
        output: Kefir.combine<Table, [Table, string, string, string], void>([
          sources.table.stream.toProperty(),
          sources.columnName.stream.toProperty(),
          sources.columnFilter.stream.toProperty(),
          sources.compareValue.stream.toProperty()
        ])
          .toProperty()
          .map(([table, columnName, columnFilter, compareValue]) => {
            console.log(
              "mapping combined streams",
              table,
              columnName,
              columnFilter,
              compareValue
            );
            const filter = filters[columnFilter] || (() => true);
            table = table || { rows: [], columns: [] };
            const newRows = table.rows.filter((row) =>
              filter(row[columnName], compareValue)
            );

            return {
              rows: newRows,
              columns: table.columns
            };
          })
          .toProperty()
      }
    };
  },
  Component: function ({ data }) {
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <FilterForm
          colName="asdfasdf"
          colFilter=""
          compareVal=""
          onChange={({ colName, colFilter, compareVal }) => {
            data.sources.columnName.emit(colName);
            data.sources.columnFilter.emit(colFilter);
            data.sources.compareValue.emit(compareVal);
          }}
        />
      </BaseNode>
    );
  }
} as GraphNode<FilterIO>;

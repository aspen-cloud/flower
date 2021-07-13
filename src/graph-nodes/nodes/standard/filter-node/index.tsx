import React from "react";

import { GraphNode, Table } from "../../../../types";
import BaseNode from "../../../../base-node";
import filters from "./filters";
import { BehaviorSubject, combineLatest } from "rxjs";
import { map } from "rxjs/operators";
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
    table: BehaviorSubject<Table<any>>;
    columnAccessor: BehaviorSubject<string>;
    columnFilter: BehaviorSubject<string>;
    compareValue: BehaviorSubject<string>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

export default {
  initializeStreams: function () {
    const sources = {
      table: new BehaviorSubject({ columns: [], rows: [] } as Table<any>),
      columnAccessor: new BehaviorSubject(""),
      columnFilter: new BehaviorSubject(""),
      compareValue: new BehaviorSubject(""),
    };
    return {
      sources,
      sinks: {
        output: combineLatest([
          sources.table,
          sources.columnAccessor,
          sources.columnFilter,
          sources.compareValue,
        ]).pipe(
          map(([table, columnAccessor, columnFilter, compareValue]) => {
            const filter = filters[columnFilter] || (() => true);
            const newRows = table.rows.filter((row) =>
              filter(row[columnAccessor], compareValue),
            );

            return {
              rows: newRows,
              columns: table.columns,
            };
          }),
        ) as BehaviorSubject<Table<any>>,
      },
    };
  },
  Component: function ({ data }) {
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <FilterForm
          colAccessor=""
          colFilter=""
          compareVal=""
          onChange={({ colAccessor, colFilter, compareVal }) => {
            data.sources.columnAccessor.next(colAccessor);
            data.sources.columnFilter.next(colFilter);
            data.sources.compareValue.next(compareVal);
          }}
          columns={data.sources.table.value.columns}
        />
      </BaseNode>
    );
  },
} as GraphNode<FilterIO>;

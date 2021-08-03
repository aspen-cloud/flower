import { array, defaulted, enums, Infer, object, string } from "superstruct";
import { useCallback, useMemo, useState } from "react";
import BaseNode from "../../../components/base-node";
import { TableStruct } from "../../../structs";
import filters from "../../nodes/standard/filter-node/filters";
import DirtyInput from "../../../dirty-input";
import { Table } from "../../../types";
import { NodeClass } from "../../../prograph";

const Filter: NodeClass = {
  inputs: {
    table: defaulted(TableStruct, () => ({ rows: [], columns: [] })),
  },
  sources: {
    columnAccessor: defaulted(string(), ""),
    columnFilter: defaulted(string(), ""),
    compareValue: defaulted(string(), ""),
  },
  outputs: {
    table: {
      func: ({ table, columnAccessor, columnFilter, compareValue }) => {
        const filter = filters[columnFilter] || (() => true);
        const newRows = table.rows.filter((row) =>
          filter(row[columnAccessor]?.underlyingValue, compareValue),
        );

        return {
          rows: newRows,
          columns: table.columns,
        };
      },
      struct: TableStruct,
    },
  },
  Component: ({ data }) => {
    const columnAccessor: string = useMemo(
      () => data.sources.columnAccessor.value,
      [data.sources.columnAccessor.value],
    );
    const setColumnAccessor = useCallback(
      (newColumnAccessor) => {
        data.sources.columnAccessor.set(newColumnAccessor);
      },
      [data.sources.columnAccessor],
    );

    const columnFilter: string = useMemo(
      () => data.sources.columnFilter.value,
      [data.sources.columnFilter.value],
    );
    const setColumnFilter = useCallback(
      (newColumnFilter) => {
        data.sources.columnFilter.set(newColumnFilter);
      },
      [data.sources.columnFilter],
    );

    const setCompareValue = useCallback(
      (newCompareValue) => {
        data.sources.compareValue.set(newCompareValue);
      },
      [data.sources.compareValue],
    );

    const columnOptions = useMemo(
      () => [
        <option disabled selected value={""}>
          {" "}
          -- select a column --{" "}
        </option>,
        ...data.inputs.table.columns.map((c) => (
          <option value={c.accessor}>{c.Header}</option>
        )),
      ],
      [data.inputs.table.columns],
    );

    return (
      <BaseNode label="Filter" sources={data.inputs} sinks={data.outputs}>
        <div className="transformer">
          <div>
            <label>
              Column Name
              <select
                value={columnAccessor}
                onChange={(e) => setColumnAccessor(e.target.value)}
              >
                {columnOptions}
              </select>
            </label>
          </div>
          <div>
            <label>
              Filter
              <select
                value={columnFilter}
                onChange={(e) => setColumnFilter(e.target.value)}
              >
                {[
                  <option disabled selected value={""}>
                    {" "}
                    -- select a filter --{" "}
                  </option>,
                  ...Object.keys(filters).map((filter) => (
                    <option key={filter}>{filter}</option>
                  )),
                ]}
              </select>
            </label>
          </div>
          <div>
            <label>
              Compare value
              <DirtyInput
                onConfirm={(value) => setCompareValue(value)}
                value={data.sources.compareValue.value}
              />
            </label>
          </div>
        </div>
      </BaseNode>
    );
  },
};

export default Filter;

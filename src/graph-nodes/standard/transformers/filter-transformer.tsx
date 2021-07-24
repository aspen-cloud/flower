import { array, defaulted, enums, Infer, object, string } from "superstruct";
import { useCallback, useMemo, useState } from "react";
import BaseNode from "../../../base-node";
import { TableStruct } from "../../../structs";
import filters from "../../nodes/standard/filter-node/filters";
import DirtyInput from "../../../dirty-input";

const Filter = {
  inputs: {
    table: defaulted(TableStruct, {}),
  },
  sources: {
    columnAccessor: defaulted(string(), ""),
    columnFilter: defaulted(string(), ""),
    compareValue: defaulted(string(), ""),
  },
  outputs: {
    table: ({ table, columnAccessor, columnFilter, compareValue }) => {
      const filter = filters[columnFilter] || (() => true);
      const newRows = table.rows.filter((row) =>
        filter(row[columnAccessor], compareValue),
      );

      return {
        rows: newRows,
        columns: table.columns,
      };
    },
  },
  Component: ({ data }) => {
    const columnAccessor: string = useMemo(
      () => data.sources.columnAccessor.value,
      [data.sources.columnAccessor],
    );
    const setColumnAccessor = useCallback(
      (newColumnAccessor) => {
        data.sources.columnAccessor.set(newColumnAccessor);
      },
      [data.sources.columnAccessor],
    );

    const columnFilter: string = useMemo(
      () => data.sources.columnFilter.value,
      [data.sources.columnFilter],
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

    return (
      <BaseNode sources={data.inputs} sinks={data.outputs}>
        <div style={{ backgroundColor: "white" }} className="transformer">
          <div>
            <h3>Filter</h3>
            <label>
              Column Name
              <select
                value={columnAccessor}
                onChange={(e) => setColumnAccessor(e.target.value)}
              >
                {[
                  <option disabled selected value={""}>
                    {" "}
                    -- select a column --{" "}
                  </option>,
                  ...data.inputs.table.columns.map((c) => (
                    <option value={c.accessor}>{c.Header}</option>
                  )),
                ]}
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

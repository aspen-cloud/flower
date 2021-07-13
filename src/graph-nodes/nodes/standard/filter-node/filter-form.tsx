import { useEffect, useState } from "react";
import { Column } from "../../../../types";
import filters from "./filters";

interface FilterFormProps {
  colAccessor: string;
  colFilter: string;
  compareVal: string;
  onChange: (any) => void;
  columns: Column[];
}

export default function FilterForm({
  colAccessor,
  colFilter,
  compareVal,
  onChange,
  columns,
}: FilterFormProps) {
  const [column, setColumn] = useState(colAccessor || "");
  const [columnFilter, setColumnFilter] = useState(colFilter || "");
  const [compareValue, setCompareValue] = useState(compareVal || "");

  useEffect(() => {
    onChange({
      colAccessor: column,
      colFilter: columnFilter,
      compareVal: compareValue,
    });
  }, [column, columnFilter, compareValue, onChange]);

  return (
    <>
      <div style={{ backgroundColor: "white" }} className="transformer">
        <div>
          <h3>Filter</h3>
          <label>
            Column Name
            <select value={column} onChange={(e) => setColumn(e.target.value)}>
              {[
                <option disabled selected value={""}>
                  {" "}
                  -- select a column --{" "}
                </option>,
                ...columns.map((c) => (
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
            <input
              placeholder="foo"
              onChange={(e) => setCompareValue(e.target.value)}
            />
          </label>
        </div>
      </div>
    </>
  );
}

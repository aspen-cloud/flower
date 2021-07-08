import { useEffect, useState } from "react";
import filters from "./filters";

interface FilterFormProps {
  colName: string;
  colFilter: string;
  compareVal: string;
  onChange: (any) => void;
  columnValues: string[];
}

export default function FilterForm({
  colName,
  colFilter,
  compareVal,
  onChange,
  columnValues,
}: FilterFormProps) {
  const [column, setColumn] = useState(colName || "");
  const [columnFilter, setColumnFilter] = useState(colFilter || "");
  const [compareValue, setCompareValue] = useState(compareVal || "");

  useEffect(() => {
    onChange({
      colName: column,
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
                ...columnValues.map((c) => <option value={c}>{c}</option>),
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

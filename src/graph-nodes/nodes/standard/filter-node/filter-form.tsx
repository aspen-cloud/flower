import { useEffect, useState } from "react";

export default function FilterForm({
  colName,
  colFilter,
  compareVal,
  onChange
}) {
  const [newColName, setNewColName] = useState(colName || "");
  const [columnFilter, setColumnFilter] = useState(colFilter || "");
  const [compareValue, setCompareValue] = useState(compareVal || "");

  useEffect(() => {
    onChange({
      colName: newColName,
      colFilter: columnFilter,
      compareVal: compareValue
    });
  }, [newColName, columnFilter, compareValue, onChange]);

  return (
    <>
      <div style={{ backgroundColor: "white" }} className="transformer">
        <div>
          <h3>Filter</h3>
          <label>
            Column Name
            <input
              placeholder="velocity"
              onChange={(e) => setNewColName(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Filter
            <input
              placeholder="eq"
              onChange={(e) => setColumnFilter(e.target.value)}
            />
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

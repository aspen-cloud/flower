import { useEffect, useState } from "react";

export default function ColumnGeneratorForm({ colName, colFormula, onChange }) {
  const [newColName, setNewColName] = useState(colName || "");
  const [colExpr, setColExpr] = useState(colFormula || "");

  useEffect(() => {
    onChange({
      colName: newColName,
      colFormula: colExpr
    });
  }, [newColName, colExpr, onChange]);

  return (
    <>
      <div style={{ backgroundColor: "white" }} className="transformer">
        <div>
          <h3>Add a column</h3>
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
            Formula
            <input
              placeholder="distance / time"
              onChange={(e) => setColExpr(e.target.value)}
            />
          </label>
        </div>
      </div>
    </>
  );
}

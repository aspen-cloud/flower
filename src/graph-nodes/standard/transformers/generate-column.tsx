import { FormGroup } from "@blueprintjs/core";
import { nanoid } from "nanoid";
import { any, defaulted, func, string } from "superstruct";
import BaseNode from "../../../components/base-node";
import DirtyInput from "../../../dirty-input";

const GenerateColumn = {
  sources: {
    columnName: defaulted(string(), () => ""),
  },
  inputs: {
    table: defaulted(any(), () => ({ rows: [], columns: [] })),
    func: defaulted(func(), () => (val) => val),
  },
  outputs: {
    table: ({ table, func, columnName }) => {
      if (!func) return table;
      const accessor = `user-col-${columnName || nanoid()}`;

      const newTable = {
        rows: table.rows.map((row) => {
          const newCellVal = func(row);
          return {
            ...row,
            [accessor]: {
              underlyingValue: newCellVal,
              readValue: newCellVal,
              writeValue: newCellVal,
            },
          };
        }),
        columns: [...table.columns, { accessor, Header: columnName }],
      };

      return newTable;
    },
  },
  Component: ({ data: { sources, inputs, outputs } }) => {
    const { columnName } = sources;
    return (
      <BaseNode label="Generate Column" sources={inputs} sinks={outputs}>
        <div>
          <FormGroup label="Column Name">
            <DirtyInput
              value={columnName.value}
              onConfirm={(val) => {
                columnName.set(val);
              }}
            />
          </FormGroup>
        </div>
      </BaseNode>
    );
  },
};

export default GenerateColumn;

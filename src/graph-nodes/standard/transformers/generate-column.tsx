import { FormGroup } from "@blueprintjs/core";
import { nanoid } from "nanoid";
import { any, defaulted, func, string } from "superstruct";
import BaseNode from "../../../components/base-node";
import DirtyInput from "../../../dirty-input";
import { NodeClass } from "../../../prograph";
import { TableStruct } from "../../../structs";
import { inferType } from "../../../utils/tables";

const GenerateColumn: NodeClass = {
  sources: {
    columnName: defaulted(string(), () => ""),
  },
  inputs: {
    table: defaulted(any(), () => ({ rows: [], columns: [] })),
    func: defaulted(func(), () => (val) => val),
  },
  outputs: {
    table: {
      func: ({ table, func, columnName }) => {
        if (!func) return table;
        const accessor = `user-col-${columnName || nanoid()}`;

        const newRows = table.rows.map((row) => {
          const newCellVal = func(row);
          return {
            ...row,
            [accessor]: {
              underlyingValue: newCellVal,
              readValue: newCellVal.toString(),
              writeValue: newCellVal.toString(),
            },
          };
        });

        const newTable = {
          rows: newRows,
          columns: [
            ...table.columns,
            {
              accessor,
              Header: columnName,
              Type: inferType(newRows[0].underlyingValue), // TODO be smarter (or less smart?) about infering column type
            },
          ],
        };

        return newTable;
      },
      struct: TableStruct,
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

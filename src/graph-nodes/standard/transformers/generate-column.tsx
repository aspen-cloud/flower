import { FormGroup } from "@blueprintjs/core";
import { nanoid } from "nanoid";
import BaseNode from "../../../components/base-node";
import DirtyInput from "../../../dirty-input";
import { registerNode, ValueTypes } from "../../../node-type-manager";
import { inferType } from "../../../utils/tables";

const GenerateColumn = registerNode({
  sources: {
    columnName: ValueTypes.STRING,
  },
  inputs: {
    table: ValueTypes.TABLE,
    func: ValueTypes.FUNCTION,
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
      returns: ValueTypes.TABLE,
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
});

export default GenerateColumn;

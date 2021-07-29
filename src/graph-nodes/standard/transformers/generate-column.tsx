import { FormGroup, H5, InputGroup } from "@blueprintjs/core";
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
      return {
        rows: table.rows.map((row) => ({ ...row, [columnName]: func(row) })),
        columns: [
          ...table.columns,
          { accessor: columnName, Header: columnName },
        ],
      };
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

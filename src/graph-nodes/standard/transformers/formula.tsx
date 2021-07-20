import { InputGroup } from "@blueprintjs/core";
import { array, string, defaulted, object } from "superstruct";
import BaseNode from "../../../base-node";
import formulajs from "@formulajs/formulajs";

const FormulaParser = require("hot-formula-parser").Parser;

const Formula = {
  inputs: {
    tableSchema: defaulted(object({ rows: array(), columns: array() }), () => ({
      rows: [],
      columns: [],
    })),
  },
  sources: {
    formulaText: defaulted(string(), () => ""),
  },
  outputs: {
    function: ({ formulaText, tableSchema }) => {
      return (record: Record<string, any>) => {
        const parser = new FormulaParser();
        parser.on(
          "callFunction",
          (name: string, args: any[], done: (result: any) => void) => {
            done(formulajs[name](...args));
          }
        );

        for (const prop of tableSchema.columns) {
          parser.setVariable(prop.Header, record[prop.accessor]);
        }
        const { error, result } = parser.parse(formulaText);
        if (error) {
          //throw new Error(error);
          return error;
        }
        return result;
      };
    },
  },
  Component: ({ data: { sources, inputs, outputs } }) => {
    // TODO use inputs.tableSchema to create autocomplete
    return (
      <BaseNode sources={inputs} sinks={outputs}>
        <InputGroup
          leftIcon="function"
          value={sources.formulaText.value}
          onChange={(e) => {
            sources.formulaText.set(e.target.value);
          }}
        />
      </BaseNode>
    );
  },
};

export default Formula;

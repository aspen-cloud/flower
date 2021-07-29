import { InputGroup } from "@blueprintjs/core";
import { array, string, defaulted, object } from "superstruct";
import BaseNode from "../../../components/base-node";
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
          },
        );

        for (const prop of tableSchema.columns) {
          parser.setVariable(
            prop.Header,
            record[prop.accessor].underlyingValue,
          );
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
      <BaseNode label="Formula" sources={inputs} sinks={outputs}>
        <InputGroup
          leftIcon="function"
          value={sources.formulaText.value}
          onChange={(e) => {
            sources.formulaText.set(e.target.value);
            const caret = e.target.selectionStart;
            const element = e.target;
            window.requestAnimationFrame(() => {
              element.selectionStart = caret;
              element.selectionEnd = caret;
            });
          }}
        />
      </BaseNode>
    );
  },
};

export default Formula;

import { InputGroup } from "@blueprintjs/core";
import BaseNode from "../../../components/base-node";
import formulajs from "@formulajs/formulajs";
import { registerNode, ValueTypes } from "../../../node-type-manager";

const FormulaParser = require("hot-formula-parser").Parser;

const Formula = registerNode({
  inputs: {
    tableSchema: ValueTypes.TABLE,
  },
  sources: {
    formulaText: ValueTypes.STRING,
  },
  outputs: {
    function: {
      func: ({ formulaText, tableSchema }) => {
        return (record: Record<string, any>) => {
          const parser = new FormulaParser();
          parser.on(
            "callFunction",
            (name: string, args: any[], done: (result: any) => void) => {
              done(formulajs[name](...args));
            },
          );

          for (const prop of tableSchema.columns) {
            if (record[prop.accessor]) {
              parser.setVariable(
                prop.Header.split(" ").join("_"),
                record[prop.accessor]?.underlyingValue,
              );
            }
          }
          const { error, result } = parser.parse(formulaText);
          if (error) {
            console.error("formula", error);
            //throw new Error(error);
            return error;
          }
          return result;
        };
      },
      returns: ValueTypes.ANY,
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
});

export default Formula;

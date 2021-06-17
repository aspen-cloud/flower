import { object, string } from "superstruct";

const FormulaParser = require("hot-formula-parser").Parser;

export const Formula = {
  label: "⨐",
  inputs: {
    record: {
      type: object()
    },
    formula: {
      type: string()
    }
  },
  outputs: {
    output: ({ record, formula }) => {
      const parser = new FormulaParser();
      for (const prop in record) {
        parser.setVariable(prop, record[prop]);
      }
      const { error, result } = parser.parse(formula);
      if (error) {
        throw new Error(error);
      }
      return result;
    }
  }
};

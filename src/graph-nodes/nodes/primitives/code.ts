import { any, string } from "superstruct";

export const JS = {
  label: "Javascript",
  inputs: {
    code: string(),
    input: any()
  },
  outputs: {
    result({ code, input }) {
      console.log(code, input);
      const func = new Function("input", code);
      return func(input);
    }
  }
};

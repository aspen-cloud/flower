import { number } from "superstruct";

export const inputs = {
  left: {
    type: number()
  },
  right: {
    type: number()
  }
};

export const outputs = {
  difference: ({ left, right }) => left - right
};

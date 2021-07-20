import { defaulted, number } from "superstruct";
import BaseNode from "../../../base-node";
import Sort from "./sort-transformer";
import Select from "./select-transformer";
import Join from "./join-transformer";
import Group from "./group-transformer";
import Formula from "./formula";
import GenerateColumn from "./generate-column";
import Filter from "./filter-transformer";

const Add = {
  inputs: {
    left: defaulted(number(), 0),
    right: defaulted(number(), 0),
  },
  outputs: {
    sum: ({ left, right }) => +left + +right,
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode sources={inputs} sinks={outputs}>
        <div>{"Add"}</div>
      </BaseNode>
    );
  },
};

// Example of error thrown in output
const Divide = {
  inputs: {
    numerator: defaulted(number(), 0),
    divisor: defaulted(number(), 0),
  },
  outputs: {
    quotient: ({ numerator, divisor }) => {
      if (divisor === 0) throw new Error("Cannot divide by 0");

      return +numerator / +divisor;
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode sources={inputs} sinks={outputs}>
        <div>{"Divide"}</div>
      </BaseNode>
    );
  },
};

export default {
  Add,
  Sort,
  Select,
  Join,
  Group,
  Formula,
  GenerateColumn,
  Filter,
  Divide,
};

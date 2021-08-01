import { defaulted, number } from "superstruct";
import BaseNode from "../../../components/base-node";
import Sort from "./sort-transformer";
import Select from "./select-transformer";
import Join from "./join-transformer";
import Group from "./group-transformer";
import Formula from "./formula";
import GenerateColumn from "./generate-column";
import Filter from "./filter-transformer";
import { Icon } from "@blueprintjs/core";
import { NodeClass } from "../../../prograph";

const Add: NodeClass = {
  inputs: {
    left: defaulted(number(), 0),
    right: defaulted(number(), 0),
  },
  sources: {},
  outputs: {
    sum: {
      func: ({ left, right }) => +left + +right,
      struct: number(),
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Add" sources={inputs} sinks={outputs}>
        <Icon icon="plus" />
      </BaseNode>
    );
  },
};

const Subtract: NodeClass = {
  inputs: {
    left: defaulted(number(), 0),
    right: defaulted(number(), 0),
  },
  sources: {},
  outputs: {
    difference: { func: ({ left, right }) => +left - +right, struct: number() },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Subtract" sources={inputs} sinks={outputs}>
        <Icon icon="minus" />
      </BaseNode>
    );
  },
};

const Multiply: NodeClass = {
  inputs: {
    left: defaulted(number(), 0),
    right: defaulted(number(), 0),
  },
  sources: {},
  outputs: {
    product: { func: ({ left, right }) => +left * +right, struct: number() },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Multiply" sources={inputs} sinks={outputs}>
        <Icon icon="asterisk" />
      </BaseNode>
    );
  },
};

// Example of error thrown in output
const Divide: NodeClass = {
  inputs: {
    numerator: defaulted(number(), 0),
    divisor: defaulted(number(), 0),
  },
  sources: {},
  outputs: {
    quotient: {
      func: ({ numerator, divisor }) => {
        if (divisor === 0) throw new Error("Cannot divide by 0");

        return +numerator / +divisor;
      },
      struct: number(),
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Divide" sources={inputs} sinks={outputs}>
        <Icon icon="slash" />
      </BaseNode>
    );
  },
};

export default {
  Add,
  Subtract,
  Multiply,
  Divide,
  Sort,
  Select,
  Join,
  Group,
  Formula,
  GenerateColumn,
  Filter,
};

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
      <BaseNode label="Add" sources={inputs} sinks={outputs}>
        <Icon icon="plus" />
      </BaseNode>
    );
  },
};

const Subtract = {
  inputs: {
    left: defaulted(number(), 0),
    right: defaulted(number(), 0),
  },
  outputs: {
    difference: ({ left, right }) => +left - +right,
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Subtract" sources={inputs} sinks={outputs}>
        <Icon icon="minus" />
      </BaseNode>
    );
  },
};

const Multiply = {
  inputs: {
    left: defaulted(number(), 0),
    right: defaulted(number(), 0),
  },
  outputs: {
    product: ({ left, right }) => +left * +right,
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

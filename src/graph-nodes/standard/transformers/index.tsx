import BaseNode from "../../../components/base-node";
import Sort from "./sort-transformer";
import Select from "./select-transformer";
import Join from "./join-transformer";
import Group from "./group-transformer";
import Formula from "./formula";
import GenerateColumn from "./generate-column";
import Filter from "./filter-transformer";
import { Icon } from "@blueprintjs/core";
import { registerNode, ValueTypes } from "../../../node-type-manager";

const Add = registerNode({
  inputs: {
    left: ValueTypes.NUMBER,
    right: ValueTypes.NUMBER,
  },
  sources: {},
  outputs: {
    sum: {
      func: ({ left, right }) => +left + +right,
      returns: ValueTypes.NUMBER,
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Add" sources={inputs} sinks={outputs}>
        <Icon icon="plus" />
      </BaseNode>
    );
  },
});

const Subtract = registerNode({
  inputs: {
    left: ValueTypes.NUMBER,
    right: ValueTypes.NUMBER,
  },
  sources: {},
  outputs: {
    difference: {
      func: ({ left, right }) => +left - +right,
      returns: ValueTypes.NUMBER,
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Subtract" sources={inputs} sinks={outputs}>
        <Icon icon="minus" />
      </BaseNode>
    );
  },
});

const Multiply = registerNode({
  inputs: {
    left: ValueTypes.NUMBER,
    right: ValueTypes.NUMBER,
  },
  sources: {},
  outputs: {
    product: {
      func: ({ left, right }) => +left * +right,
      returns: ValueTypes.NUMBER,
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Multiply" sources={inputs} sinks={outputs}>
        <Icon icon="asterisk" />
      </BaseNode>
    );
  },
});

// Example of error thrown in output
const Divide = registerNode({
  inputs: {
    numerator: ValueTypes.NUMBER,
    divisor: ValueTypes.NUMBER,
  },
  sources: {},
  outputs: {
    quotient: {
      func: ({ numerator, divisor }) => {
        if (divisor === 0) throw new Error("Cannot divide by 0");

        return +numerator / +divisor;
      },
      returns: ValueTypes.NUMBER,
    },
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode label="Divide" sources={inputs} sinks={outputs}>
        <Icon icon="slash" />
      </BaseNode>
    );
  },
});

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

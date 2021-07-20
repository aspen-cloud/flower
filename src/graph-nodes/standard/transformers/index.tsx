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

export default {
  Add,
  Sort,
  Select,
  Join,
  Group,
  Formula,
  GenerateColumn,
  Filter,
};

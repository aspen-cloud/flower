import { any, number } from "superstruct";
import BaseNode from "../../../base-node";

const Add = {
  inputs: {
    left: number(),
    right: number(),
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
};

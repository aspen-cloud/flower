import { any, array, enums, number, object, string } from "superstruct";
import { useEffect, useState } from "react";
import BaseNode from "../../../base-node";
import Sort from "./sort-transformer";
import Select from "./select-transformer";
import Join from "./join-transformer";
import Group from "./group-transformer";

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
  Sort,
  Select,
  Join,
  Group,
};

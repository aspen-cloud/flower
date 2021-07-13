import { any } from "superstruct";
import BaseNode from "../../../base-node";

const Viewer = {
  inputs: {
    value: any(),
  },
  outputs: {
    value: ({ value }) => value,
  },
  Component: ({ data: { inputs, outputs } }) => {
    return (
      <BaseNode sources={inputs} sinks={outputs}>
        <div>{JSON.stringify(outputs.value)}</div>
      </BaseNode>
    );
  },
};

export default {
  Viewer,
};

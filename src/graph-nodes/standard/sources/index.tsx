import { number, string } from "superstruct";
import BaseNode from "../../../base-node";

const Text = {
  sources: {
    text: string(),
  },
  Component: ({ data: { sources } }) => {
    return (
      <BaseNode sources={{}} sinks={sources}>
        <input
          value={sources.text.value}
          onChange={(e) => sources.text.set(e.target.value)}
        />
      </BaseNode>
    );
  },
};

const Number = {
  sources: {
    number: number(),
  },
  Component: ({ data: { sources } }) => {
    return (
      <BaseNode sources={{}} sinks={sources}>
        <input
          type="number"
          value={sources.number.value}
          onChange={(e) => sources.number.set(e.target.value)}
        />
      </BaseNode>
    );
  },
};

export default {
  Text,
  Number,
};

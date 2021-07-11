import { string } from "superstruct";
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

export default {
  Text,
};

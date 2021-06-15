import { regexp, string } from "superstruct";

export const Split = {
  label: "Split",
  inputs: {
    text: {
      type: string()
    },
    seperator: {
      type: string()
    }
  },
  outputs: {
    difference: ({ text, seperator }) => text.split(seperator)
  }
};

export const Reverse = {
  label: "Reverse",
  inputs: {
    text: {
      type: string()
    }
  },
  outputs: {
    difference: ({ text }) => text.split("").reverse().join("")
  }
};

export const Extract = {
  label: "Extract",
  inputs: {
    text: {
      type: string()
    },
    pattern: {
      type: regexp()
    }
  },
  outputs: {
    match: ({ text, pattern }) => text.match(RegExp(pattern))[1]
  }
};

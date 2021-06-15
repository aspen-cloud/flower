import { number } from "superstruct";

export const Subtract = {
  label: "-",
  inputs: {
    left: {
      type: number()
    },
    right: {
      type: number()
    }
  },
  outputs: {
    difference: ({ left, right }) => left - right
  }
};

export const Add = {
  label: "+",
  inputs: {
    left: {
      type: number()
    },
    right: {
      type: number()
    }
  },
  outputs: {
    sum: ({ left, right }) => +left + +right
  }
};

export const Divide = {
  label: "/",
  inputs: {
    left: {
      type: number()
    },
    right: {
      type: number()
    }
  },
  outputs: {
    sum: ({ left, right }) => left / right
  }
};

export const Multiply = {
  label: "*",
  inputs: {
    left: {
      type: number()
    },
    right: {
      type: number()
    }
  },
  outputs: {
    sum: ({ left, right }) => left + right
  }
};

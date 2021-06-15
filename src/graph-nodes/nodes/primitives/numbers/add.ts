import { number, Struct } from "superstruct";

const AddNode: FlowNode<{ a: Input<number>; b: Input<number> }> = {
  inputs: {
    a: {
      type: number()
    },
    b: {
      type: number()
    }
  },
  outputs: {
    sum(a, b) {
      return a + b;
    }
  }
};

interface Input<E> {
  type: Struct<E, null>;
}

type Output<I, O> = (args: I) => O;

interface FlowNode<I extends Record<string, Input<any>>> {
  inputs: I;
  outputs: Record<string, Output<I, any>>;
}

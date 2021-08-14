import { z } from "zod";
import {
  FUNCTION,
  NUMBER,
  STRING,
  TABLE,
  AnyValueSchemas,
  ANY,
  BOOLEAN,
} from "./value-schemas";
import { FunctionComponent } from "react";
import { NodeComponentProps } from "react-flow-renderer";

export enum ValueTypes {
  STRING,
  NUMBER,
  TABLE,
  FUNCTION,
  ANY,
  BOOLEAN,
}

export const ValueSchemas: Record<ValueTypes, z.ZodTypeAny> = {
  [ValueTypes.STRING]: STRING,
  [ValueTypes.NUMBER]: NUMBER,
  [ValueTypes.TABLE]: TABLE,
  [ValueTypes.FUNCTION]: FUNCTION,
  [ValueTypes.ANY]: ANY,
  [ValueTypes.BOOLEAN]: BOOLEAN,
};

// export interface NodeClass<IS extends string, SS extends string> {
//   inputs: Record<IS, ValueTypes>;
//   sources: Record<SS, ValueTypes>;
//   outputs: {
//     func: (args: {
//       input: Record<IS, z.infer<AnyValueSchemas>>;
//       sources: Record<IS, z.infer<AnyValueSchemas>>;
//     }) => {};
//     returns: ValueTypes;
//   };
// }

export function registerNode<
  I extends Record<string, ValueTypes> = {},
  S extends Record<string, ValueTypes> = {},
>({
  inputs,
  sources,
  outputs = {},
  Component,
}: {
  inputs?: I;
  sources?: S;
  outputs?: Record<
    string,
    {
      func: (args: Record<keyof I | keyof S, any>) => any;
      returns: ValueTypes;
    }
  >;
  Component: FunctionComponent<
    NodeComponentProps<{
      inputs: Record<keyof I, any>;
      sources: Record<keyof S, any>;
      outputs: Record<keyof typeof outputs, any>;
      metadata?: {
        size?: {
          height: number;
          width: number;
        };
      };
    }>
  >;
}) {
  return {
    inputs,
    outputs,
    sources,
    Component,
  };
}

export type NodeClass = ReturnType<typeof registerNode>;

export function parseType(type: ValueTypes, value: any) {
  const schema = ValueSchemas[type];
  return schema.safeParse(value);
}

export function isType(type: ValueTypes, value: any) {
  return parseType(type, value).success;
}

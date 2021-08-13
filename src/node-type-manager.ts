import { z } from "zod";
import {
  FUNCTION,
  NUMBER,
  STRING,
  TABLE,
  AnyValueSchemas,
} from "./value-schemas";

export enum ValueTypes {
  STRING,
  NUMBER,
  TABLE,
  FUNCTION,
}

export const ValueSchemas: Record<ValueTypes, AnyValueSchemas> = {
  [ValueTypes.STRING]: STRING,
  [ValueTypes.NUMBER]: NUMBER,
  [ValueTypes.TABLE]: TABLE,
  [ValueTypes.FUNCTION]: FUNCTION,
};

export interface NodeClass<IS extends string, SS extends string> {
  inputs: Record<IS, ValueTypes>;
  sources: Record<SS, ValueTypes>;
  outputs: (args: {
    input: Record<IS, z.infer<AnyValueSchemas>>;
    sources: Record<IS, z.infer<AnyValueSchemas>>;
  }) => {};
}

// export function registerNode<
//   IS extends string,
//   I extends z.ZodObject<Record<IS, AnyValueSchemas>>,
//   S extends z.ZodObject<Record<string, AnyValueSchemas>>,
// >({
//   inputs,
//   sources,
//   outputs,
// }: {
//   inputs: I;
//   sources: S;
//   outputs: Record<
//     string,
//     (args: {
//       inputs: z.infer<typeof inputs>;
//       sources: z.infer<typeof sources>;
//     }) => any
//   >;
// }) {
//   return {
//     inputs,
//     outputs,
//     sources,
//   };
// }

// registerNode({
//   inputs: z.object({
//     table: ValueSchemas[ValueTypes.TABLE],
//   }),
//   sources: z.object({
//     label: ValueSchemas[ValueTypes.STRING],
//   }),
//   outputs: {
//     newTable: ({ inputs, sources }) => {
//       return sources.label;
//     },
//   },
// });

// function defToSchema(def: Record<string, ValueTypes>) {
//   const schemas = Object.fromEntries(
//     Object.entries(def).map(([name, type]) => [name, ValueSchemas[type]]),
//   );
//   const obj = z.object(schemas);
//   return obj as z.infer<typeof obj>;
// }

// // const test = defToSchema({ num: ValueTypes.NUMBER });

// const testSchema = z.object({
//   table: TABLE,
// });

// type testType = z.infer<typeof testSchema>;

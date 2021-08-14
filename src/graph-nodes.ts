import * as AllNodes from "./graph-nodes/index";
import { NodeClass } from "./node-type-manager";

function flattenNodes(nodes: Record<string, any>): [string, NodeClass][] {
  return Object.entries(nodes).flatMap(([key, val]) =>
    val.Component ? [[key, val]] : flattenNodes(val),
  );
}

const GraphNodes = Object.fromEntries(flattenNodes(AllNodes));

export default GraphNodes;

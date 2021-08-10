import { css } from "@emotion/css";
import { useEffect, useMemo, useState } from "react";
import { Edge, Node, Elements } from "react-flow-renderer";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { create, Struct } from "superstruct";
import ProGraph, { GraphEdge, GraphNode } from "../prograph";

function graphToReactFlow(
  prograph,
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
): Elements {
  const flowNodes: Node[] = Array.from(nodes.values()).map((node) => ({
    position: node.position,
    // TODO pass in Graph Values
    data: getComponentDataForNode(prograph, node),
    type: node.type,
    id: node.id.toString(),
  }));

  const flowEdges: Edge[] = Array.from(edges.values()).map((conn) => {
    const fromNode = prograph.getNode(conn.from.nodeId);
    const toNodeInputs = prograph.getNodeInputs(conn.to.nodeId);
    return {
      id: conn.id.toString(),
      source: conn.from.nodeId.toString(),
      sourceHandle: conn.from.busKey,
      target: conn.to.nodeId.toString(),
      targetHandle: conn.to.busKey,
      data: {
        outputs: fromNode.outputs ? fromNode.outputs[conn.from.busKey] : {},
        inputs: toNodeInputs ? toNodeInputs[conn.to.busKey] : {},
      },
    };
  });
  return [...flowNodes, ...flowEdges];
}

function getComponentDataForNode(prograph: ProGraph, node: GraphNode) {
  const nodeClass = prograph.nodeTypes[node.type];
  const inputEntries: [string, Struct][] = nodeClass.inputs
    ? Object.entries(nodeClass.inputs)
    : [];
  const sourceEntries: [string, Struct][] = nodeClass.sources
    ? Object.entries(nodeClass.sources)
    : [];
  const outputKeys = nodeClass.outputs ? Object.keys(nodeClass.outputs) : [];

  const inputVals = prograph.getNodeInputs(node.id);
  const inputs = Object.fromEntries(
    inputEntries.map(([key, struct]) => [
      key,
      create(inputVals[key].value, struct),
    ]),
  );
  const sources = sourceEntries.reduce((acc, curr) => {
    const [key, struct] = curr;
    acc[key] = {
      value: create(node.sources[key], struct),
      set: (newVal) => {
        prograph.updateNodeSources(node.id, { [key]: newVal });
      },
    };
    return acc;
  }, {});
  const outputs = outputKeys.reduce((acc, curr) => {
    acc[curr] = node.outputs && node.outputs[curr].value;
    return acc;
  }, {});

  return {
    inputs,
    sources,
    outputs,
  };
}

export default function useReactFlowNodes(prograph: ProGraph) {
  const [graphElements, setGraphElements] = useState<Elements>([]);

  const flowElements$ = useMemo(
    () =>
      combineLatest(prograph.nodes$, prograph.edges$).pipe(
        map(([nodes, edges]) => graphToReactFlow(prograph, nodes, edges)),
      ),
    [prograph],
  );

  useEffect(() => {
    const elementSubscription = flowElements$.subscribe((els) => {
      setGraphElements(els);
    });

    return () => {
      elementSubscription.unsubscribe();
    };
  }, [flowElements$]);

  return graphElements;
}

import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { nanoid } from "nanoid";
import { BehaviorSubject } from "rxjs";
import { create, object, Struct } from "superstruct";

// Value or error produced by output function
interface NodeOutput {
  value: any;
  error: Error;
}

// value or error from recieved input value
interface NodeInput {
  value: any;
  error: Error;
}

export interface GraphNode {
  id: string;
  type: string;
  sources?: Record<string, any>;
  outputs?: Record<string, NodeOutput>;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  from: {
    nodeId: string;
    busKey: string;
  };
  to: {
    nodeId: string;
    busKey: string;
  };
}

function mapToGraphNode(ymap: Y.Map<any>) {
  return Object.fromEntries(ymap?.entries() || []) as GraphNode;
}

export default class ProGraph {
  private ydoc: Y.Doc;
  nodes$: BehaviorSubject<Map<string, GraphNode>>;
  edges$: BehaviorSubject<Map<string, GraphEdge>>;
  _nodes: Y.Map<Y.Map<any>>; // where inner map should represent a GraphNode TODO: can we enforce typing?
  _edges: Y.Map<GraphEdge>;
  _outputs: Record<string, Record<string, NodeOutput>>;
  nodeTypes: Record<string, any>;
  presence: awarenessProtocol.Awareness;

  constructor(nodeTypes: Record<string, any>) {
    this.nodeTypes = nodeTypes;
  }

  loadGraph(graphId: string) {
    if (this.ydoc) {
      this.ydoc.destroy();
    }
    this.ydoc = new Y.Doc();
    this._outputs = {};

    const indexeddbProvider = new IndexeddbPersistence(graphId, this.ydoc);
    
    this.presence = new awarenessProtocol.Awareness(this.ydoc);
    const webRTCProvider = new WebrtcProvider(graphId, this.ydoc, {
      signaling: ["wss://signaling.yjs.dev"],
      password: graphId,
      maxConns: 70 + Math.floor(Math.random() * 70),
      awareness: this.presence,
      filterBcConns: true,
      peerOpts: {},
    });

    this._nodes = this.ydoc.getMap("nodes");
    this._edges = this.ydoc.getMap("edges");

    if (this.nodes$) {
      this.nodes$.complete();
    }
    if (this.edges$) {
      this.edges$.complete();
    }

    this.nodes$ = new BehaviorSubject(this.nodes);
    this.edges$ = new BehaviorSubject(this.edges);

    this._nodes.observe((_changeEvent, transaction) => {
      if (!transaction.local) {
        // TODO pass in affected nodes
        this.evaluate();
      }
      this.nodes$.next(this.nodes);
    });

    this._edges.observe((_changeEvent, transaction) => {
      if (!transaction.local) {
        // TODO pass in affected nodes
        this.evaluate();
      }
      this.edges$.next(this.edges);
    });

    indexeddbProvider.whenSynced.then(() => {
      this.evaluate();
    });
  }

  getNode(nodeId: string) {
    return {
      ...mapToGraphNode(this._nodes.get(nodeId)),
      outputs: this._outputs[nodeId],
    };
  }

  getEdge(edgeId: string) {
    return this._edges.get(edgeId);
  }

  get nodes() {
    const plainMap = new Map(
      // TODO: need map to node?
      Object.entries(this._nodes.toJSON() as Record<string, GraphNode>),
    );

    plainMap.forEach((node) => {
      node.outputs = this._outputs[node.id];
    });
    return plainMap;
  }

  get edges() {
    return new Map(Object.entries(this._edges.toJSON())) as Map<
      string,
      GraphEdge
    >;
  }

  wipeAll() {
    this._nodes.clear();
    this._edges.clear();
  }

  addNode(node: Omit<GraphNode, "id" | "outputs">) {
    const id = nanoid(5);
    this._nodes.set(id, new Y.Map(Object.entries({ id, ...node })));
    if (node.sources) {
      this.updateNodeSources(id, node.sources);
    }
    this.evaluate([id]);
    return id;
  }

  addEdge(edge: Omit<GraphEdge, "id">) {
    const id = nanoid(5);
    const newEdge = this._edges.set(id, { id, ...edge });
    this.evaluate([newEdge.from.nodeId]);
    return id;
  }

  moveNode(nodeId: string, position: { x: number; y: number }) {
    const currNode = this._nodes.get(nodeId);
    // Might need to copy to new node to trigger observer
    currNode.set("position", position);
    // this._nodes.set(nodeId, currNode);
  }

  deleteNode(nodeId: string) {
    this.ydoc.transact(() => {
      this._nodes.delete(nodeId);
      const connectedEdges = Array.from(this._edges.values()).filter(
        (edge: GraphEdge) =>
          edge.to.nodeId === nodeId || edge.from.nodeId === nodeId,
      );
      for (const edge of connectedEdges) {
        this._edges.delete(edge.id);
      }
    });
    delete this._outputs[nodeId];
    this.evaluate(); // TODO pass in affected nodes based on edges
  }

  deleteEdge(edgeId: string) {
    this._edges.delete(edgeId);
    this.evaluate();
  }

  getTopologicallySortedNodes(seedNodeIds?: string[]) {
    const visited = {};
    const nodeList = [];

    const visit = (nodeId: string) => {
      if (visited[nodeId]) return;
      visited[nodeId] = true;
      const deps = Array.from(this._edges.values()).filter(
        (edge: GraphEdge) => edge.from.nodeId === nodeId,
      );
      deps.forEach((edge) => visit(edge.to.nodeId));
      nodeList.push(nodeId);
    };

    if (seedNodeIds) {
      seedNodeIds.forEach((nodeId) => visit(nodeId));
    } else {
      Array.from(this._nodes.values()).forEach((nodeMap) => {
        const node = mapToGraphNode(nodeMap);
        visit(node.id);
      });
    }

    return nodeList
      .reverse()
      .map((nodeId) => mapToGraphNode(this._nodes.get(nodeId)));
  }

  getNodeInputs(nodeId: string) {
    const nodeMap = this._nodes.get(nodeId);
    // Note: optimally we'd always be requesting data from a consistent state across edges / nodes and wouldn't need this guard
    if (!nodeMap) return;
    const node = mapToGraphNode(nodeMap);
    const inboundEdges = Object.fromEntries(
      Array.from(this._edges.values() as IterableIterator<GraphEdge>)
        .filter((edge) => edge.to.nodeId === nodeId)
        .map((edge) => [edge.to.busKey, edge]),
    );

    const inputTypes = this.nodeTypes[node.type].inputs || {};
    const inputs: Record<string, NodeInput> = {};
    for (const [inputKey, inputStruct] of Object.entries<Struct>(inputTypes)) {
      const edge = inboundEdges[inputKey];
      try {
        if (edge) {
          const inboundNodeId = edge.from.nodeId;
          const inboundNodeOutputs = {
            ...Object.fromEntries(
              Object.entries(this._outputs[inboundNodeId] || {}).map(
                ([k, v]) => [k, v?.value],
              ),
            ),
          };
          if (!inboundNodeOutputs) continue;
          inputs[inputKey] = {
            value: create(inboundNodeOutputs[edge.from.busKey], inputStruct),
            error: undefined,
          };
        } else {
          inputs[inputKey] = { value: undefined, error: undefined };
        }
      } catch (err) {
        inputs[inputKey] = { value: undefined, error: err };
      }
    }

    return inputs;
  }

  getNodeSources(nodeId) {
    const node = mapToGraphNode(this._nodes.get(nodeId));
    const sources = {};
    for (const [sourcekey, sourceStruct] of Object.entries<Struct>(
      this.nodeTypes[node.type].sources || {},
    )) {
      try {
        sources[sourcekey] = create(node.sources[sourcekey], sourceStruct);
      } catch (e) {
        sources[sourcekey] = undefined;
      }
    }
    return sources;
  }

  updateNodeSources(nodeId: string, sources: Record<string, any>) {
    const node = this._nodes.get(nodeId);
    node.set("sources", { ...node.get("sources"), ...sources });
    this.evaluate([nodeId]);
  }

  updateNodeOutput(
    nodeId: string,
    outputs: Record<string, NodeOutput>,
    evaluate = true,
  ) {
    const currentNodeOutputs = this._outputs[nodeId] || {};
    this._outputs[nodeId] = { ...currentNodeOutputs, ...outputs };
    if (evaluate) {
      this.evaluate([nodeId]);
    }
  }

  evaluate(changedNodes?: string[]) {
    const sorting = this.getTopologicallySortedNodes(changedNodes);

    for (const node of sorting) {
      const nodeClass = this.nodeTypes[node.type];
      const inputVals = Object.fromEntries(
        Object.entries(this.getNodeInputs(node.id)).map(([k, v]) => [
          k,
          v?.value,
        ]),
      );
      const sourceVals = this.getNodeSources(node.id);

      for (const outputKey in nodeClass.outputs) {
        let outputValue;
        let outputError;
        try {
          outputValue = nodeClass.outputs[outputKey]({
            ...inputVals,
            ...sourceVals,
          });
        } catch (err) {
          outputError = err;
        }
        this.updateNodeOutput(
          node.id,
          { [outputKey]: { value: outputValue, error: outputError } },
          false,
        );
      }
    }

    this._broadcastChanges();
  }

  _broadcastChanges() {
    this.nodes$.next(this.nodes);
    this.edges$.next(this.edges);
  }
}

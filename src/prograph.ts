import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { nanoid } from "nanoid";
import { BehaviorSubject } from "rxjs";
import { create, object, Struct } from "superstruct";

export interface GraphNode {
  id: string;
  type: string;
  sources?: Record<string, any>;
  outputs?: Record<string, any>;
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

export default class ProGraph {
  private ydoc: Y.Doc;
  nodes$: BehaviorSubject<Map<string, GraphNode>>;
  edges$: BehaviorSubject<Map<string, GraphEdge>>;
  _nodes: Y.Map<GraphNode>;
  _edges: Y.Map<GraphEdge>;
  _outputs: Record<string, Record<string, any>>;
  nodeTypes: Record<string, any>;

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
    const webRTCProvider = new WebrtcProvider(graphId, this.ydoc, {
      signaling: ["wss://signaling.yjs.dev"],
      password: "aspen-demo",
      maxConns: 70 + Math.floor(Math.random() * 70),
      awareness: new awarenessProtocol.Awareness(this.ydoc),
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
      ...this._nodes.get(nodeId),
      outputs: this._outputs[nodeId],
    };
  }

  get nodes() {
    const plainMap = new Map(
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
    this._nodes.set(id, { id, ...node });
    if (node.sources) {
      this.updateNodeOutput(id, node.sources);
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
    currNode.position = position;
    this._nodes.set(nodeId, currNode);
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
    const edge = this._edges.get(edgeId);
    this._edges.delete(edgeId);
    this.evaluate([edge.to.nodeId]);
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
      Array.from(this._nodes.values()).forEach((node) => visit(node.id));
    }

    return nodeList.reverse().map((nodeId) => this._nodes.get(nodeId));
  }

  getNodeInputs(nodeId: string) {
    const node = this._nodes.get(nodeId);
    const inboundEdges = Object.fromEntries(
      Array.from(this._edges.values() as IterableIterator<GraphEdge>)
        .filter((edge) => edge.to.nodeId === nodeId)
        .map((edge) => [edge.to.busKey, edge]),
    );

    const inputTypes = this.nodeTypes[node.type].inputs || {};
    let inputs = {};
    for (const [inputKey, inputStruct] of Object.entries<Struct>(inputTypes)) {
      const edge = inboundEdges[inputKey];
      if (edge) {
        const inboundNodeId = edge.from.nodeId;
        const inboundNodeOutputs = {
          ...this._nodes.get(inboundNodeId).sources,
          ...this._outputs[inboundNodeId],
        };
        if (!inboundNodeOutputs) continue;
        inputs[inputKey] = inboundNodeOutputs[edge.from.busKey];
      } else {
        inputs[inputKey] = undefined;
      }
    }

    inputs = create(inputs, object(inputTypes));

    for (const [sourcekey, sourceStruct] of Object.entries<Struct>(
      this.nodeTypes[node.type].sources || {},
    )) {
      try {
        inputs[sourcekey] = create(node.sources[sourcekey], sourceStruct);
      } catch (e) {
        inputs[sourcekey] = undefined;
      }
    }

    return inputs;
  }

  updateNodeSource(nodeId: string, valueKey: string, newValue: any) {
    const node = this._nodes.get(nodeId);
    node.sources = { ...node.sources, [valueKey]: newValue };
    this._nodes.set(node.id, { ...node });
    this.updateNodeOutput(nodeId, { [valueKey]: newValue });
  }

  updateNodeOutput(
    nodeId: string,
    outputs: Record<string, any>,
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
      const inputVals = this.getNodeInputs(node.id);

      for (const outputKey in nodeClass.outputs) {
        const newVal = nodeClass.outputs[outputKey](inputVals);
        this.updateNodeOutput(node.id, { [outputKey]: newVal }, false);
      }
    }

    this._broadcastChanges();
  }

  _broadcastChanges() {
    this.nodes$.next(this.nodes);
    this.edges$.next(this.edges);
  }
}

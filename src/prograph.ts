import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { nanoid } from "nanoid";
import { BehaviorSubject, Subject } from "rxjs";
import { NodeClass, parseType, ValueTypes } from "./node-type-manager";

if (process.env.NODE_ENV === "development") {
  if (process.argv.includes("log")) {
    localStorage.setItem("log", "true");
  }
} else {
  localStorage.removeItem("log");
}

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
  size?: { width: number; height: number };
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
  private rootDoc: Y.Doc;
  nodes$: BehaviorSubject<Map<string, GraphNode>>;
  edges$: BehaviorSubject<Map<string, GraphEdge>>;

  id: string;

  private _name: string;
  name$: BehaviorSubject<string>;
  description: Y.Text;

  graph: Y.Doc;

  _nodes: Y.Map<GraphNode>;
  _edges: Y.Map<GraphEdge>;
  private _undoManager: Y.UndoManager;

  _outputs: Record<string, Record<string, NodeOutput>>;
  nodeTypes: Record<string, NodeClass>;

  presence: awarenessProtocol.Awareness;

  loadedGraph$: Subject<string>;

  constructor(
    id: string,
    yDoc: Y.Doc,
    nodeTypes: Record<string, NodeClass>,
    autoLoadGraph = true,
  ) {
    this.id = id;
    this.rootDoc = yDoc;
    this.nodeTypes = nodeTypes;
    this.loadedGraph$ = new Subject();

    this._outputs = {};

    new IndexeddbPersistence(id, this.rootDoc);

    this.presence = new awarenessProtocol.Awareness(this.rootDoc);

    // @ts-ignore
    new WebrtcProvider(id, this.rootDoc, {
      password: id,
      maxConns: 70 + Math.floor(Math.random() * 70),
      awareness: this.presence,
      filterBcConns: true,
      peerOpts: {},
    });

    this.graph = this.rootDoc.getMap().get("graph");
    if (!this.graph) {
      this.graph = new Y.Doc({ autoLoad: true });
    } else {
      this.graph.load();
    }

    const graphIndexeddbProvider = new IndexeddbPersistence(id, this.graph);
    graphIndexeddbProvider.whenSynced.then(() => {
      // initialize undo manager once initialized
      if (!this._undoManager) {
        this._undoManager = new Y.UndoManager([this._nodes, this._edges]);
      }
    });

    // @ts-ignore
    new WebrtcProvider(id + "_graph", this.graph);

    this._nodes = this.graph.getMap("nodes");
    this._edges = this.graph.getMap("edges");

    this._name = this.rootDoc.getMap().get("name");
    this.name$ = new BehaviorSubject(this._name);

    this.description = this.rootDoc.getText("description");

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

    graphIndexeddbProvider.whenSynced.then(() => {
      this.loadedGraph$.next(id);
      this.evaluate();
      this.name = this.rootDoc.getMap().get("name");
    });
  }

  loadGraph(graphId: string) {
    if (this.rootDoc) {
      this.rootDoc.destroy();
    }
    this.rootDoc = new Y.Doc();
  }

  unmount() {
    this.rootDoc.destroy();
    this.graph.destroy();
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

  set name(newName: string) {
    this.rootDoc.getMap().set("name", newName);
    this._name = newName;
    this.name$.next(this._name);
  }

  get name() {
    return this._name;
  }

  wipeAll() {
    this._nodes.clear();
    this._edges.clear();
  }

  undo() {
    if (this._undoManager) {
      this._undoManager.undo();
      // This is not exaclty what I expected...I thought this._broadcastChanges() should work, but it seems outputs arent reverted, so re-running
      this.evaluate();
    }
  }

  redo() {
    if (this._undoManager) {
      this._undoManager.redo();
      this.evaluate();
    }
  }

  addNode(node: Omit<GraphNode, "id" | "outputs">) {
    const id = nanoid(5);
    this.graph.transact(() => {
      const fullNode = { ...node, id };
      this._nodes.set(id, fullNode);
      if (fullNode.sources) {
        this.updateNodeSources(id, fullNode.sources, false);
      }
      this.evaluate([id]);
    });
    return id;
  }

  getEdge(edgeId: string) {
    return this._edges.get(edgeId);
  }

  addEdge(edge: Omit<GraphEdge, "id">) {
    const id = nanoid(5);
    this.graph.transact(() => {
      const newEdge = this._edges.set(id, { ...edge, id });
      this.evaluate([newEdge.from.nodeId]);
    });
    return id;
  }

  moveNode(nodeId: string, position: { x: number; y: number }) {
    const newNode = { ...this._nodes.get(nodeId) };
    newNode.position = position;
    this._nodes.set(nodeId, newNode);
  }

  resizeNode(nodeId: string, size: { width: number; height: number }) {
    const newNode = { ...this._nodes.get(nodeId) };
    // Might need to copy to new node to trigger observer
    newNode.size = size;
    this._nodes.set(nodeId, newNode);
  }

  deleteNode(nodeId: string) {
    this.graph.transact(() => {
      this._nodes.delete(nodeId);
      const connectedEdges = Array.from(this._edges.values()).filter(
        (edge: GraphEdge) =>
          edge.to.nodeId === nodeId || edge.from.nodeId === nodeId,
      );
      for (const edge of connectedEdges) {
        this._edges.delete(edge.id);
      }
      delete this._outputs[nodeId];
      this.evaluate(); // TODO pass in affected nodes based on edges
    });
  }

  deleteEdge(edgeId: string) {
    this.graph.transact(() => {
      this._edges.delete(edgeId);
      this.evaluate();
    });
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
    // Note: optimally we'd always be requesting data from a consistent state across edges / nodes and wouldn't need this guard
    if (!node) return;
    const inboundEdges = Object.fromEntries(
      Array.from(this._edges.values() as IterableIterator<GraphEdge>)
        .filter((edge) => edge.to.nodeId === nodeId)
        .map((edge) => [edge.to.busKey, edge]),
    );

    const inputTypes = this.nodeTypes[node.type].inputs || {};
    const inputs: Record<string, NodeInput> = {};
    for (const [inputKey, inputType] of Object.entries<ValueTypes>(
      inputTypes,
    )) {
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
          const parsed = parseType(
            inputType,
            inboundNodeOutputs[edge.from.busKey],
          );
          if (parsed.success === true) {
            inputs[inputKey] = {
              value: parsed.data,
              error: undefined,
            };
          } else {
            inputs[inputKey] = {
              value: undefined,
              error: parsed.error,
            };
          }
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
    const node = this._nodes.get(nodeId);
    const sources = {};
    for (const [sourcekey, sourceType] of Object.entries<ValueTypes>(
      this.nodeTypes[node.type].sources || {},
    )) {
      const parsed = parseType(sourceType, node.sources[sourcekey]);
      if (parsed.success === true) {
        sources[sourcekey] = parsed.data;
      } else {
        console.error(parsed.error);
      }
    }
    return sources;
  }

  updateNodeSources(
    nodeId: string,
    sources: Record<string, any>,
    evaluate = true,
  ) {
    const update = () => {
      const updatedNode = { ...this._nodes.get(nodeId) };
      updatedNode.sources = { ...updatedNode.sources, ...sources };
      this._nodes.set(updatedNode.id, updatedNode);
    };
    // If we don't evaluate, assume transaction is happening elsewhere (TODO: not the greatest/most obvious assumption)
    if (evaluate) {
      this.graph.transact(() => {
        update();
        this.evaluate([nodeId]);
      });
    } else {
      update();
    }
  }

  updateNodeOutput(
    nodeId: string,
    outputs: Record<string, NodeOutput>,
    evaluate = true,
  ) {
    const update = () => {
      const currentNodeOutputs = this._outputs[nodeId] || {};
      this._outputs[nodeId] = { ...currentNodeOutputs, ...outputs };
    };
    // If we don't evaluate, assume transaction is happening elsewhere (TODO: not the greatest/most obvious assumption)
    if (evaluate) {
      this.graph.transact(() => {
        update();
        this.evaluate([nodeId]);
      });
    } else {
      update();
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
          outputValue = nodeClass.outputs[outputKey].func({
            ...inputVals,
            ...sourceVals,
          });
        } catch (err) {
          console.error("output error", err, inputVals, sourceVals);
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

  getSuggestedEdges() {
    const nodeList = Array.from(this._nodes.values());
    const inputs = nodeList.flatMap((node) => {
      const Type = this.nodeTypes[node.type];
      if (!Type.inputs) return [];
      return Object.entries(Type.inputs).map(([busKey, type]) => ({
        nodeId: node.id,
        busKey,
        type,
      }));
    });

    const edgeList = Array.from(this._edges.values());

    const inboundEdgeSet = new Set(
      edgeList.map((edge) => `${edge.to.nodeId}-${edge.to.busKey}`),
    );

    const openInputs = inputs.filter(
      (input) => !inboundEdgeSet.has(`${input.nodeId}-${input.busKey}`),
    );

    const outputList = nodeList.flatMap((node) => {
      const Type = this.nodeTypes[node.type];
      if (!Type.outputs) return [];
      return Object.entries(Type.outputs).map(
        ([busKey, { func, returns }]) => ({
          nodeId: node.id,
          busKey,
          type: returns,
        }),
      );
    });

    const typeToOutputs: Record<
      string,
      { nodeId: string; busKey: string; type: string }[]
    > = outputList.reduce((acc, curr) => {
      if (!acc[curr.type]) {
        acc[curr.type] = [];
      }

      acc[curr.type].push({
        nodeId: curr.nodeId,
        busKey: curr.busKey,
        type: curr.type,
      });

      return acc;
    }, {});

    return openInputs.flatMap((input) => {
      const possibleOutputs =
        input.type === ValueTypes.ANY
          ? Object.values(typeToOutputs).flatMap((outputs) => outputs)
          : typeToOutputs[input.type] || [];

      return possibleOutputs
        .filter((output) => output.nodeId !== input.nodeId)
        .map((output) => ({
          from: {
            nodeId: output.nodeId,
            busKey: output.busKey,
          },
          to: {
            nodeId: input.nodeId,
            busKey: input.busKey,
          },
        }));
    });
  }

  _broadcastChanges() {
    this.nodes$.next(this.nodes);
    this.edges$.next(this.edges);
  }

  replaceElementGroup(nodeIds: string[], edgeIds: string[]) {
    const selectedNodes = nodeIds
      .map((id) => this.nodes.get(id))
      .filter((el) => el);
    const selectedEdges = edgeIds
      .map((id) => this.edges.get(id))
      .filter((el) => el);

    const newNodes: Record<string, string> = Object.fromEntries(
      selectedNodes.map((node) => {
        const { id, ...nodeData } = node;
        const newNode = this.addNode({
          ...nodeData,
        });
        return [node.id, newNode];
      }),
    );

    const connectionsAdded: Record<string, string[]> = {};

    for (const [originalNodeId, newNode] of Object.entries(newNodes)) {
      const incomingConnections = Array.from(this.edges.values()).filter(
        (conn) => conn.to.nodeId === originalNodeId,
      );
      const outgoingConnections = Array.from(this.edges.values()).filter(
        (conn) => conn.from.nodeId === originalNodeId,
      );

      for (const connection of incomingConnections) {
        const {
          to: { busKey: toBus },
          from: { busKey: fromBus, nodeId: fromNode },
        } = connection;
        if (!edgeIds.includes(connection.id)) {
          this.deleteEdge(connection.id);
        }

        if (
          !connectionsAdded[newNode]?.includes(newNodes[fromNode] ?? fromNode)
        ) {
          this.addEdge({
            from: {
              nodeId: newNodes[fromNode] ?? fromNode,
              busKey: fromBus,
            },
            to: {
              nodeId: newNode,
              busKey: toBus,
            },
          });
          connectionsAdded[newNode] = [
            ...(connectionsAdded[newNode] || []),
            newNodes[fromNode] ?? fromNode,
          ];
        }
      }
      for (const connection of outgoingConnections) {
        const {
          to: { busKey: toBus, nodeId: toNode },
          from: { busKey: fromBus },
        } = connection;
        if (!selectedEdges.includes(connection)) {
          this.deleteEdge(connection.id);
        }

        // BUG HERE?
        if (
          !connectionsAdded[newNode]?.includes(
            newNodes[newNodes[toNode] ?? toNode] ?? newNode,
          )
        ) {
          this.addEdge({
            from: {
              nodeId: newNode,
              busKey: fromBus,
            },
            to: {
              nodeId: newNodes[toNode] ?? toNode,
              busKey: toBus,
            },
          });
          connectionsAdded[newNodes[toNode] ?? toNode] = [
            ...(connectionsAdded[newNodes[toNode] ?? toNode] || []),
            newNode,
          ];
        }
      }
    }
  }
}

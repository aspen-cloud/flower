import Dexie, { IndexableTypeArrayReadonly } from "dexie";
import { BehaviorSubject } from "rxjs";
import { GraphEdge, GraphNode } from "./graph-store";
export default class ProGraph {
  nodes: Map<number, GraphNode>;
  edges: Map<number, GraphEdge>;
  nodes$: BehaviorSubject<Map<number, GraphNode>>;
  edges$: BehaviorSubject<Map<number, GraphEdge>>;
  initPromise: Promise<void>;
  db: Dexie;
  nodeTypes: Record<string, any>; // TODO add better type

  constructor(db: Dexie, nodeTypes: Record<string, any>) {
    this.db = db;
    this.edges$ = new BehaviorSubject<Map<number, GraphEdge>>(new Map());
    this.nodes$ = new BehaviorSubject<Map<number, GraphNode>>(new Map());
    this.initPromise = this._init();
    this.nodeTypes = nodeTypes;
  }

  private async _init() {
    this.nodes = new Map(
      (await this.db.table("nodes").toArray()).map((node) => [node.id, node]),
    );
    this.nodes$.next(this.nodes);

    this.edges = new Map(
      (await this.db.table("edges").toArray()).map((edge) => [edge.id, edge]),
    );
    this.edges$.next(this.edges);

    this.db.on("changes", (changes) => {
      for (const change of changes) {
        if (!["nodes", "edges"].includes(change.table)) return;
        switch (change.type) {
          case 1: // CREATED
          case 2: // UPDATED
            this[change.table].set(change.key, {
              id: change.key,
              ...change.obj,
            });
            break;
          case 3: // DELETED
            this[change.table].delete(change.key);
            break;
          default:
            //should never happen
            break;
        }
      }
      const anyNodesChanged = changes.some(
        (change) => change.table === "nodes",
      );
      const anyEdgesChanged = changes.some(
        (change) => change.table === "edges",
      );
      if (anyNodesChanged) {
        this.nodes$.next(this.nodes);
      }
      if (anyEdgesChanged) {
        this.edges$.next(this.edges);
      }
    });
  }

  async moveNode(nodeId: number, position: { x: number; y: number }) {
    return this.db.table("nodes").update(nodeId, { position });
  }

  async wipeAll() {
    await this.db.table("nodes").clear();
    await this.db.table("edges").clear();
  }

  async addNode(node: Omit<GraphNode, "id">) {
    const resp = await this.db.table("nodes").add(node);
    await this.evaluate([+resp]);
    return resp;
  }

  async addEdge(edge: Omit<GraphEdge, "id">) {
    // TODO ensure nodes exist
    const resp = await this.db.table("edges").add(edge);
    await this.evaluate([+edge.from.nodeId]);
    return resp;
  }

  async deleteNode(nodeId: number) {
    return this.db.transaction(
      "rw",
      this.db.table("edges"),
      this.db.table("nodes"),
      async () => {
        const edges = await (await this.getNodeEdges(nodeId)).primaryKeys();
        await this.db
          .table("edges")
          .bulkDelete(edges as IndexableTypeArrayReadonly);
        await this.db.table("nodes").delete(nodeId);
        await this.evaluate(); // TODO pass in affected nodes based on edges
      },
    );
  }

  async getNode(nodeId: number) {
    return this.db.table("nodes").get(+nodeId);
  }

  async deleteEdge(edgeKey: number) {
    return this.db.table("edges").delete(+edgeKey);
  }

  async getNodeEdges(nodeId: number) {
    return this.db
      .table("edges")
      .where("from.nodeId")
      .equals(nodeId)
      .or("to.nodeId")
      .equals(nodeId);
  }

  async getAllNodes(): Promise<GraphNode[]> {
    return this.db.table("nodes").toCollection().toArray();
  }

  async getAllEdges(): Promise<GraphEdge[]> {
    return this.db.table("edges").toCollection().toArray();
  }

  async getTopologicallySortedNodes(seedNodeIds?: number[]) {
    const nodes = await this.getAllNodes();
    const edges = await this.getAllEdges();

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const visited = {};
    const nodeList = [];

    const visit = (nodeId: number) => {
      if (visited[nodeId]) return;
      visited[nodeId] = true;
      const deps = Array.from(edges).filter(
        (edge) => edge.from.nodeId === nodeId,
      );
      deps.forEach((edge) => visit(edge.to.nodeId));
      nodeList.push(nodeId);
    };

    if (seedNodeIds) {
      seedNodeIds.forEach((nodeId) => visit(nodeId));
    } else {
      nodes.forEach((node) => visit(node.id));
    }

    return nodeList.reverse().map((nodeId) => nodeMap.get(nodeId));
  }

  async getNodeInputs(nodeId: number) {
    // TODO Potentially run in a "read only" transaction
    const inboundEdges = await this.db
      .table("edges")
      .where("to.nodeId")
      .equals(nodeId)
      .toArray();
    const connectedNodeSet: Set<number> = inboundEdges.reduce((set, edge) => {
      set.add(edge.from.nodeId);
      return set;
    }, new Set());

    const connectedNodes = new Map(
      (
        await this.db
          .table("nodes")
          .bulkGet(Array.from(connectedNodeSet.values()))
      ).map((node) => [node.id, node]),
    );

    const inputs = {};
    for (const edge of inboundEdges) {
      inputs[edge.to.busKey] = connectedNodes.get(edge.from.nodeId).values[
        edge.from.busKey
      ];
    }
    return inputs;
  }

  async updateNodeValue(
    nodeId: number,
    valueKey: string,
    newValue: any,
    evaluate = true,
  ) {
    const resp = await this.db
      .table("nodes")
      .update(nodeId, { values: { [valueKey]: newValue } });
    if (evaluate) await this.evaluate([nodeId]);
    return resp;
  }

  async evaluate(changedNodes?: number[]) {
    const sorting = await this.getTopologicallySortedNodes(changedNodes);

    for (const node of sorting) {
      const nodeClass = this.nodeTypes[node.type];
      if (!nodeClass.inputs || nodeClass.inputs.length === 0) continue;
      const inputVals = await this.getNodeInputs(node.id);

      for (const outputKey in nodeClass.outputs) {
        const newVal = nodeClass.outputs[outputKey](inputVals);
        await this.updateNodeValue(node.id, outputKey, newVal, false);
      }
    }
  }
}

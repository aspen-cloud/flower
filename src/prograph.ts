import Dexie, { IndexableTypeArrayReadonly } from "dexie";
import { BehaviorSubject, combineLatest } from "rxjs";
import { GraphEdge, GraphNode } from "./graph-store";
import {
  Elements as FlowElements,
  Node as FlowNode,
  Edge as FlowEdge,
} from "react-flow-renderer";

export default class ProGraph {
  nodes: Map<number, GraphNode>;
  edges: Map<number, GraphEdge>;
  nodes$: BehaviorSubject<Map<number, GraphNode>>;
  edges$: BehaviorSubject<Map<number, GraphEdge>>;
  deps;
  initPromise: Promise<void>;
  db: Dexie;
  constructor(db: Dexie) {
    this.db = db;
    this.edges$ = new BehaviorSubject<Map<number, GraphEdge>>(new Map());
    this.nodes$ = new BehaviorSubject<Map<number, GraphNode>>(new Map());
    this.initPromise = this._init();
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
      console.log("changes", changes);
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
    return this.db.table("nodes").add(node);
  }

  async addEdge(edge: GraphEdge) {
    // TODO ensure nodes exist
    return this.db.table("edges").add(edge);
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
      },
    );
  }

  async deleteEdge(edgeKey: string) {
    return this.db.table("edges").delete(edgeKey);
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

  getNodeInputs(nodeId: number) {}

  updateNodeValue(nodeId: number, valueKey: string, newValue: any) {
    return this.db
      .table("nodes")
      .update(nodeId, { values: { [valueKey]: newValue } });
  }
}

function outputToFn(type: string, busKey: string) {
  return (a, b) => a + b;
}

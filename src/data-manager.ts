import * as Y from "yjs";
import { nanoid } from "nanoid";
import { IndexeddbPersistence } from "y-indexeddb";
import ProGraph, { NodeClass } from "./prograph";

/**
 * This manages graphs and tables. It's able to load "all" graphs into memory
 * by lazily loading sub-documents that contain the actual nodes, edges, and data.
 */

class DataManager {
  private rootDoc: Y.Doc;

  currentGraph: ProGraph;

  private _graphs: Y.Map<Y.Doc>;

  readonly nodeTypes: Record<string, NodeClass>;

  ready: Promise<void>;

  constructor(nodeTypes: Record<string, NodeClass>) {
    this.rootDoc = new Y.Doc();
    this.nodeTypes = nodeTypes;

    this._graphs = this.rootDoc.getMap("graphs");

    const indexeddbProvider = new IndexeddbPersistence("graphs", this.rootDoc);

    this.ready = new Promise((resolve) => {
      indexeddbProvider.whenSynced.then(() => {
        resolve();
      });
    });
  }

  async getAllGraphs() {
    await this.ready;
    for (const graph of this._graphs) {
      try {
        graph.load();
      } catch (e) {
        console.log("couldn't load", graph);
      }
    }
    return this._graphs.toJSON() as Record<string, Y.Doc>;
  }

  async deleteGraph(graphId: string) {
    this._graphs.delete(graphId);
  }

  async newGraph() {
    const id = nanoid();
    const newGraphDoc = new Y.Doc({ autoLoad: true, guid: id });
    this._graphs.set(id, newGraphDoc);
    console.log("creating graph", id);
    return this.loadGraph(id);
  }

  async loadGraph(id: string): Promise<ProGraph> {
    await this.ready;
    const doc = this._graphs.get(id);
    if (!doc) {
      //throw new Error(`Could not find graph with ID: ${id}`);
      console.log(`Could not find graph with ID: ${id}`);
      console.log(this._graphs);
      return this.loadRemoteGraph(id);
    }
    doc.load();
    return new ProGraph(id, doc, this.nodeTypes);
  }

  async loadRemoteGraph(id: string) {
    const newGraphDoc = new Y.Doc({ autoLoad: true, guid: id });
    this._graphs.set(id, newGraphDoc);
    console.log("loading remote graph", id);
    return this.loadGraph(id);
  }
}

export default DataManager;

import * as Y from "yjs";
import { nanoid } from "nanoid";
import { IndexeddbPersistence } from "y-indexeddb";
import ProGraph, { NodeClass } from "./prograph";
import { BehaviorSubject } from "rxjs";

/**
 * This manages graphs and tables. It's able to load "all" graphs into memory
 * by lazily loading sub-documents that contain the actual nodes, edges, and data.
 */

class DataManager {
  private rootDoc: Y.Doc;

  currentGraph: ProGraph;

  private _graphs: Y.Map<Y.Doc>;

  graphs$: BehaviorSubject<Record<string, Y.Doc>>;

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

    this.graphs$ = new BehaviorSubject(this._graphs.toJSON());

    this._graphs.observe(async () => {
      this.graphs$.next(await this.getAllGraphs());
    });

    this.rootDoc.on("subdocs", async () => {
      console.log("subdoc loaded");
      this.graphs$.next(await this.getAllGraphs());
    });

    this.ready.then(() => {
      for (const entry of this._graphs) {
        const [id, graph] = entry as unknown as [string, Y.Doc];
        try {
          graph.load();
        } catch (e) {
          console.log("couldn't load", graph);
        }
      }
    });
  }

  async getAllGraphs() {
    await this.ready;
    const graphEntries = await Promise.all(
      Array.from(this._graphs.keys()).map(async (id) => {
        return [id, await this.loadGraphDoc(id)];
      }),
    );

    return Object.fromEntries(graphEntries);
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

  async loadGraphDoc(graphId: string): Promise<Y.Doc> {
    const yDoc = this._graphs.get(graphId);

    const dbProvider = new IndexeddbPersistence(graphId, yDoc);

    await dbProvider.whenSynced;

    return yDoc;
  }
}

export default DataManager;
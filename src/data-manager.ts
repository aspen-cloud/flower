import * as Y from "yjs";
import { nanoid } from "nanoid";
import { IndexeddbPersistence } from "y-indexeddb";
import ProGraph from "./prograph";
import { BehaviorSubject } from "rxjs";
import { NodeClass } from "./node-type-manager";
import { Column, RowValue, Table } from "./types";
import GraphNodes from "./graph-nodes";
import { WebrtcProvider } from "y-webrtc";

const loadedTables = new Set<string>();

/**
 * This manages graphs and tables. It's able to load "all" graphs into memory
 * by lazily loading sub-documents that contain the actual nodes, edges, and data.
 */

class DataManager {
  private rootDoc: Y.Doc;

  currentGraph: ProGraph;

  private _graphs: Y.Map<Y.Doc>;

  graphs$: BehaviorSubject<Record<string, Y.Doc>>;

  private _tables: Y.Map<Y.Doc>;

  tables$: BehaviorSubject<Record<string, Y.Doc>>;

  readonly nodeTypes: Record<string, NodeClass>;

  ready: Promise<void>;

  constructor(nodeTypes: Record<string, NodeClass>) {
    this.rootDoc = new Y.Doc();
    this.nodeTypes = nodeTypes;

    this._graphs = this.rootDoc.getMap("graphs");
    this._tables = this.rootDoc.getMap("tables");

    const indexeddbProvider = new IndexeddbPersistence(
      "flow-data",
      this.rootDoc,
    );

    this.ready = new Promise((resolve) => {
      indexeddbProvider.whenSynced.then(() => {
        resolve();
      });
    });

    this.graphs$ = new BehaviorSubject(
      this._graphs.toJSON() as Record<string, Y.Doc>,
    );
    this.tables$ = new BehaviorSubject(
      this._tables.toJSON() as Record<string, Y.Doc>,
    );

    this._graphs.observe(async () => {
      this.graphs$.next(await this.getAllGraphs());
    });

    this._tables.observe(async (mapEvent, transaction) => {
      const additions = Array.from(mapEvent.changes.keys.entries()).filter(
        ([key, val]) => val.action === "add" && !loadedTables.has(key),
      );

      additions.forEach(([docId, val]) => {
        const doc = this._tables.get(docId);
        new WebrtcProvider(docId + "_table", doc);
        doc.on("destroy", () => {
          this._tables.delete(docId);
        });
        loadedTables.add(docId);
      });

      this.tables$.next(await this.getAllTables());
    });

    this.rootDoc.on("subdocs", async () => {
      this.graphs$.next(await this.getAllGraphs());
    });

    this.ready.then(() => {
      for (const entry of this._graphs) {
        const [, graph] = entry as unknown as [string, Y.Doc];
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
    const prograph = await this.loadGraph(id);
    prograph.name = "Untitled";
    return prograph;
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

  async newTable(data: Table, label?: string) {
    const tableId = nanoid();
    const newTableDoc = new Y.Doc({ autoLoad: true, guid: tableId });

    const tableDataId = nanoid();
    const tableDataDoc = new Y.Doc({ guid: tableDataId });
    newTableDoc.getMap().set("tableData", tableDataDoc);

    const columns = tableDataDoc.getArray<Column>("columns");
    columns.insert(0, data.columns);

    const rows = tableDataDoc.getArray<Record<string, RowValue>>("rows");
    rows.insert(0, data.rows);

    const metadata = newTableDoc.getMap("metadata");
    metadata.set("label", label || "Untitled"); // TODO: unique labels

    this._tables.set(tableId, newTableDoc);

    const dbProvider = new IndexeddbPersistence(
      `table-${tableId}`,
      newTableDoc,
    );
    await dbProvider.whenSynced;
    return tableId;
  }

  async getTable(id: string) {
    return await this.loadTable(id);
  }

  async getAllTables(): Promise<Record<string, Y.Doc>> {
    const tableEntries = await Promise.all(
      Array.from(this._tables.keys()).map(async (id) => {
        return [id, await this.loadTable(id)];
      }),
    );

    return Object.fromEntries(tableEntries);
  }

  private async loadTable(id: string) {
    let tableDoc = this._tables.get(id);

    if (!tableDoc) {
      tableDoc = new Y.Doc({ guid: id });
      this._tables.set(id, tableDoc);
    }

    tableDoc.on("subdocs", ({ added, removed, loaded }) => {
      loaded.forEach((subdoc) => {
        new IndexeddbPersistence(`tableData-${subdoc.guid}`, subdoc);
        new WebrtcProvider(subdoc.guid + "_tableData", subdoc);
      });

      removed.forEach((subdoc) => {
        const tableDataDbProvider = new IndexeddbPersistence(
          `tableData-${subdoc.guid}`,
          subdoc,
        );
        tableDataDbProvider.clearData();
      });
    });

    // It seems this._tables.observe (or observeDeep) isnt firing on updates to metadata, so handling here
    // works if you run set again for that id, but that is tedious to rememebr to do
    tableDoc.on("update", () =>
      this.getAllTables().then((tables) => this.tables$.next(tables)),
    );

    const dbProvider = new IndexeddbPersistence(`table-${id}`, tableDoc);
    await dbProvider.whenSynced;

    return tableDoc;
  }

  // Going nuclear for now
  // Should make sure any related nodes are deleted
  deleteTable(id: string) {
    const entry = this._tables.get(id);
    const tableData = entry.getMap().get("tableData");
    // TODO: handle idb clean up based on document event (similar to tableData)
    const tableDataDbProvider = new IndexeddbPersistence(
      `tableData-${tableData.guid}`,
      entry,
    );
    tableDataDbProvider.clearData();
    tableData.destroy();
    const tableDbProvider = new IndexeddbPersistence(`table-${id}`, entry);
    tableDbProvider.clearData();
    entry.destroy();
  }
}

export type { DataManager };

const dataManager = new DataManager(GraphNodes);

export default dataManager;

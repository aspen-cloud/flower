import Dexie from "dexie";
import { nanoid } from "nanoid";
import { BehaviorSubject } from "rxjs";

interface GraphInfo {
    id: string;
    name: string;
    owner?: string;
    collaborators?: string[];
    lastAccessed: Date;
    createdAt: Date;
}

/**
 * This should probably live in Prograph and be handled with Yjs.
 * A user should be able to sync all of their graphs across their devices.
 */

export class GraphManager extends Dexie {
    graphs: Dexie.Table<GraphInfo, string>;
    currentGraph$: BehaviorSubject<string | null>;

    constructor() {
        super("LocalGraphs");
        this.version(1).stores({
            graphs: `id,owner,*collaborators,lastAccessed,createdAt`
        });

        this.graphs = this.table('graphs');

        const lastGraphId = window.localStorage.getItem("lastGraph");
        this.currentGraph$ = new BehaviorSubject(lastGraphId || null);

        this.currentGraph$.subscribe((newGraphId) => {
            window.localStorage.setItem("lastGraph", newGraphId);
        });
    }

    async getAllGraphs() {
        return this.graphs.orderBy("lastAccessed").toArray();
    }

    async createGraph(name?: string) {
        const graphId = await this.graphs.add({
            id: nanoid(),
            name: name ?? "Untitled",
            createdAt: new Date(),
            lastAccessed: new Date(),
        });
        this.currentGraph$.next(graphId);
        return graphId;
    }

    async selectGraph(graphId: string) {
        // TODO ensure graph exists
        this.currentGraph$.next(graphId);
        this.graphs.update(graphId, {
            lastAccessed: new Date()
        });
    }

    async renameGraph(graphId: string, newName: string) {
        return this.graphs.update(graphId, {
            name: newName
        });
    }
}

export default new GraphManager();
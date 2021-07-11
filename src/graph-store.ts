import Dexie, { IndexableTypeArrayReadonly } from "dexie";
import "dexie-observable";

const db = new Dexie("LocalGraphs");

// NOTE: These are just indexes not necessarily all the data that gets stored
db.version(1).stores({
  nodes: "++id,type",
  edges:
    "++id, &[from.nodeId+from.busKey+to.nodeId+to.busKey],from.nodeId,from.busKey,to.nodeId,to.busKey",
});

export default db;

export interface Source {
  type: any;
  key: string;
  description: string;
}

export interface Sink extends Source {
  value?: any;
}

export interface GraphNode {
  id: number;
  type: string;
  //   inputs: Source[];
  //   outputs: Sink[];
  values: Record<string, any>;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: number;
  from: {
    nodeId: number;
    busKey: string;
  };
  to: {
    nodeId: number;
    busKey: string;
  };
}

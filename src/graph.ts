import {
  Elements,
  Node as FlowNode,
  Edge as FlowEdge,
} from "react-flow-renderer";
import {
  BehaviorSubject,
  Subscription,
  Observable as RxObservable,
} from "rxjs";
import { autorun, makeAutoObservable, observable } from "mobx";
import * as AllNodes from "./graph-nodes/index";
import { nanoid } from "nanoid";
import { debounceTime, map } from "rxjs/operators";

// TODO move to some utils folder
function flattenNodes(nodes: Record<string, any>): [string, any][] {
  return Object.entries(nodes).flatMap(([key, val]) =>
    val.Component ? [[key, val]] : flattenNodes(val),
  );
}

const GraphNodes = Object.fromEntries(flattenNodes(AllNodes));

type NodeId = string;

interface NodePosition {
  x: number;
  y: number;
}

interface Bus<T = any> {
  stream: BehaviorSubject<T>;
  label?: string;
  key: string;
}

interface Node {
  id: NodeId;
  type: string; // Maybe create ENUM?
  inputs: Record<string, Bus>;
  outputs: Record<string, Bus>;
  position: NodePosition;
}

interface Connection {
  id: string;

  fromNode: NodeId;
  fromBus: string;

  toNode: NodeId;
  toBus: string;

  subscription: Subscription;
}

interface ConnectionSide {
  nodeId: NodeId;
  busKey: string;
}

export default class Graph {
  nodes = observable(new Map<string, Node>());
  connections = observable(new Map<string, Connection>());

  constructor({ nodes, edges } = { nodes: [], edges: [] }) {
    // makeObservable(this, {
    //   nodes: observable,
    //   connections: observable,
    //   reactFlowElements: computed,
    //   createNode: action,
    //   moveNode: action,
    //   createConnection: action,
    //   removeNode: action,
    //   removeConnection: action,
    // });
    makeAutoObservable(this);
    for (const [id, node] of nodes) {
      this.createNode(node);
    }
    for (const [id, edge] of edges) {
      this.createConnection(edge);
    }
  }

  get state() {
    return {
      nodes: this.nodes,
      connections: this.connections,
    };
  }

  createNode({
    type,
    position,
    id,
    data,
  }: {
    type: string;
    position: NodePosition;
    id?: string;
    data?: any;
  }) {
    const { sources, sinks } = GraphNodes[type].initializeStreams({
      initialData: data,
    });
    const inputs = Object.fromEntries(
      Object.entries(sources).map(([key, stream]) => [
        key,
        { key, stream: stream as BehaviorSubject<any>, label: "" },
      ]),
    );
    const outputs = Object.fromEntries(
      Object.entries(sinks).map(([key, stream]) => [
        key,
        { key, stream: stream as BehaviorSubject<any>, label: "" },
      ]),
    );
    const newNode: Node = {
      id: id || nanoid(),
      type,
      position,
      inputs,
      outputs,
    };

    this.nodes.set(newNode.id, newNode);
  }

  moveNode(nodeId: NodeId, newPosition: NodePosition) {
    const oldNode = this.nodes.get(nodeId);
    const newNode = { ...oldNode, position: newPosition };
    // This is less than ideal but seems required to make observable react
    this.nodes.delete(nodeId);
    this.nodes.set(nodeId, newNode);
  }

  createConnection({ from, to }: { from: ConnectionSide; to: ConnectionSide }) {
    // TODO add type checks, connection checks, etc
    const fromNode = this.nodes.get(from.nodeId);
    if (!fromNode) {
      throw new Error(`Could not find node (source) with ID ${from.nodeId}`);
    }
    const toNode = this.nodes.get(to.nodeId);
    if (!toNode) {
      throw new Error(`Could not find node (target) with ID ${to.nodeId}`);
    }

    const subscription = fromNode.outputs[from.busKey].stream.subscribe(
      (latestVal: any) => {
        toNode.inputs[to.busKey].stream.next(latestVal);
      },
    );

    const connection: Connection = {
      id: `${from.nodeId}:${from.busKey}-${to.nodeId}:${to.busKey}`,
      fromNode: from.nodeId,
      fromBus: from.busKey,
      toNode: to.nodeId,
      toBus: to.busKey,
      subscription,
    };

    this.connections.set(connection.id, connection);
  }

  removeNode(nodeId: NodeId) {
    const activeConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.fromNode === nodeId || conn.toNode === nodeId,
    );
    for (const conn of activeConnections) {
      this.removeConnection(conn.id);
    }
    this.nodes.delete(nodeId);
    // TODO Remove all connections then the node
  }

  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    connection.subscription.unsubscribe();
    this.connections.delete(connectionId);
  }

  get reactFlowElements(): Elements {
    const flowNodes: FlowNode[] = Array.from(this.nodes.values()).map(
      (node) => ({
        position: node.position,
        data: {
          ...getComponentDataFromNode(node),
        },
        type: node.type,
        id: node.id,
        style: {
          padding: "10px",
          border: "1px solid white",
          borderRadius: "10px",
        },
      }),
    );

    const flowEdges: FlowEdge[] = Array.from(this.connections.values()).map(
      (conn) => ({
        id: conn.id,
        source: conn.fromNode,
        sourceHandle: conn.fromBus,
        target: conn.toNode,
        targetHandle: conn.toBus,
      }),
    );
    return [...flowNodes, ...flowEdges];
  }
}

export function persistGraph(graph: Graph) {
  const observedGraph = new RxObservable((observer) => {
    return autorun(() => {
      /**
       * _trigger is used here because for some reason mobx isn't picking up the
       * dependencies unless a method or property is accessed...
       */
      const _trigger = [graph.nodes.values(), graph.connections.values()];
      observer.next({
        nodes: graph.nodes,
        connections: graph.connections,
      });
    });
  });

  const serializedStream = observedGraph.pipe(
    debounceTime(300),
    map(({ nodes, connections }) => ({
      nodes: Array.from(nodes.entries()).map(([key, node]) => [
        key,
        nodeToJson(node),
      ]),
      edges: Array.from(connections.entries()).map(([key, conn]) => [
        key,
        connectionToJson(conn),
      ]),
    })),
  );

  const subscription = serializedStream.subscribe(({ nodes, edges }) => {
    localStorage.setItem("nodes", JSON.stringify(nodes));
    localStorage.setItem("edges", JSON.stringify(edges));
  });

  return {
    stop: subscription.unsubscribe.bind(subscription),
  };
}

function getComponentDataFromNode(node: Node) {
  const sources = Object.fromEntries(
    Object.entries(node.inputs).map(([key, { stream }]) => [key, stream]),
  );
  const sinks = Object.fromEntries(
    Object.entries(node.outputs).map(([key, { stream }]) => [key, stream]),
  );
  return {
    sources,
    sinks,
  };
}

function nodeToJson(node: Node) {
  const { id, position, type } = node;
  return { id, position, type };
}

function connectionToJson(conn: Connection): {
  from: ConnectionSide;
  to: ConnectionSide;
} {
  return {
    from: {
      nodeId: conn.fromNode,
      busKey: conn.fromBus,
    },
    to: {
      nodeId: conn.toNode,
      busKey: conn.toBus,
    },
  };
}

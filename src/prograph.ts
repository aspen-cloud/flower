import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { nanoid } from 'nanoid';

export interface GraphNode {
    id: string;
    type: string;
    values: Record<string, any>;
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
    _nodes: Y.Map<GraphNode>;
    _edges: Y.Map<GraphEdge>;
    _outputs: Record<string, Record<string, any>>;
    nodeTypes: Record<string, any>;

    constructor(nodeTypes: Record<string, any>) {
        this.ydoc = new Y.Doc()
        this.nodeTypes = nodeTypes;
        this._outputs = {}

        // this allows you to instantly get the (cached) documents data
        const indexeddbProvider = new IndexeddbPersistence('main-graph', this.ydoc)
        indexeddbProvider.whenSynced.then(() => {
            console.log('loaded data from indexed db')
        });

        this._nodes = this.ydoc.getMap('nodes');
        this._edges = this.ydoc.getMap('edges');
    }

    wipeAll() {
        this._nodes.clear();
        this._edges.clear();
    }

    addNode(node: Omit<GraphNode, "id">) {
        const id = nanoid(5);
        this._nodes.set(id, { id, ...node });
        if (node.values) {
            this.updateNodeOutput(id, node.values);
        }
        return id;
    }

    addEdge(edge: Omit<GraphEdge, "id">) {
        const id = nanoid(5);
        this._edges.set(id, { id, ...edge });
        return id;
    }

    deleteNode(nodeId: string) {
        this.ydoc.transact(() => {
            this._nodes.delete(nodeId);
            const connectedEdges = Array.from(this._edges.values()).filter((edge: GraphEdge) => edge.to.nodeId === nodeId || edge.from.nodeId === nodeId);
            for (const edge of connectedEdges) {
                this._edges.delete(edge.id);
            }
        })
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
        }

        if (seedNodeIds) {
            seedNodeIds.forEach((nodeId) => visit(nodeId));
        } else {
            Array.from(this._nodes.values()).forEach((node) => visit(node.id));
        }

        return nodeList.reverse().map((nodeId) => this._nodes.get(nodeId));
    }

    getNodeInputs(nodeId: string) {
        const inboundEdges = Array.from(this._edges.values() as IterableIterator<GraphEdge>).filter((edge) => edge.to.nodeId === nodeId);

        const inputs = {};
        for (const edge of inboundEdges) {
            const nodeOutputs = this._outputs[edge.from.nodeId];
            if (!nodeOutputs) continue;
            inputs[edge.to.busKey] = nodeOutputs[
                edge.from.busKey
            ];
        }

        const node = this._nodes.get(nodeId);
        for (const sourcekey in (this.nodeTypes[node.type].sources || {})) {
            inputs[sourcekey] = node.values[sourcekey];
        }
        return inputs;
    }

    updateNodeSource(nodeId: string,
        valueKey: string,
        newValue: any,
        evaluate = true,) {
        const node = this._nodes.get(nodeId);
        node.values = { ...node.values, [valueKey]: newValue };
        this._nodes.set(node.id, node);
        this.updateNodeOutput(nodeId, { [valueKey]: newValue });
    }

    updateNodeOutput(
        nodeId: string,
        outputs: Record<string, any>,
        evaluate = true,
    ) {
        const currentNodeOutputs = this._outputs[nodeId] || {};
        this._outputs[nodeId] = { ...currentNodeOutputs, ...outputs }
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
    }

}
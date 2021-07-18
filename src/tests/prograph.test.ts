global.indexedDB = require("fake-indexeddb");
global.IDBKeyRange = require("fake-indexeddb/lib/FDBKeyRange");
import ProGraph from "../prograph";
import { any, number } from "superstruct";

describe("basic CRUD", () => {
  const graph = new ProGraph({
    TEST_NODE: {
      inputs: {
        input: any(),
      },
      outputs: {
        output: ({ input }) => input,
      },
    },
  });

  beforeEach(() => {
    graph.wipeAll();
  });

  test("can add and read nodes", () => {
    const resp = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      sources: [],
    });

    const allNodes = graph._nodes;
    expect(allNodes.size).toBe(1);
  });

  test("can add and read edges", () => {
    const node1 = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      sources: [],
    });
    const node2 = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      sources: [],
    });
    const resp = graph.addEdge({
      from: {
        nodeId: node1,
        busKey: "output",
      },
      to: {
        nodeId: node2,
        busKey: "input",
      },
    });

    expect(resp).not.toBeNull();
    ;
    expect(graph._edges.size).toBe(1);
  });

  test("can delete node and connected to edges", () => {
    const nodeAKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      sources: [],
    });
    const nodeBKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeBKey,
        busKey: "input",
      },
    });

    graph.deleteNode(nodeBKey);

    expect(graph._nodes.size).toBe(1);
    expect(graph._edges.size).toBe(0);
  });
});

describe("topological sorting", () => {
  const graph = new ProGraph({
    TEST_NODE: {
      inputs: {
        input: any(),
      },
      outputs: {
        output: ({ input }) => input,
      },
    },
  });

  beforeEach(() => {
    graph.wipeAll();
  });

  it("correctly sorts simple graph", () => {
    const nodeAKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeBKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const edgeResp = graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeBKey,
        busKey: "input",
      },
    });

    const nodes = graph.getTopologicallySortedNodes();

    expect(nodes.map((node) => node.id)).toEqual([nodeAKey, nodeBKey]);
  });

  it("correctly sorts complex graph", () => {
    const nodeAKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeBKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeCKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeDKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeEKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });

    graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeBKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeDKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeBKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeCKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeDKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeEKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeCKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeEKey,
        busKey: "input",
      },
    });

    const nodes = graph.getTopologicallySortedNodes();
    expect(nodes.map((node) => node.id)).toEqual([
      nodeAKey,
      nodeDKey,
      nodeBKey,
      nodeCKey,
      nodeEKey,
    ]);
    expect(nodes).toHaveLength(5);
  });

  it("correctly partials order based on seed", () => {
    const nodeAKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeBKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeCKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeDKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });
    const nodeEKey = graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      sources: [],
    });

    graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeBKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeDKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeBKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeCKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeDKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeEKey,
        busKey: "input",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeCKey,
        busKey: "output",
      },
      to: {
        nodeId: nodeEKey,
        busKey: "input",
      },
    });

    const bDeps = graph.getTopologicallySortedNodes([nodeBKey]);
    expect(bDeps.map((node) => node.id)).toEqual([
      nodeBKey,
      nodeCKey,
      nodeEKey,
    ]);

    const aDeps = graph.getTopologicallySortedNodes([nodeAKey]);
    expect(aDeps.map((node) => node.id)).toEqual([
      nodeAKey,
      nodeDKey,
      nodeBKey,
      nodeCKey,
      nodeEKey,
    ]);

    const eDeps = graph.getTopologicallySortedNodes([nodeEKey]);
    expect(eDeps.map((node) => node.id)).toEqual([nodeEKey]);

    const cDeps = graph.getTopologicallySortedNodes([nodeCKey]);
    expect(cDeps.map((node) => node.id)).toEqual([nodeCKey, nodeEKey]);
  });
});

describe("Basic calculations", () => {
  let graph: ProGraph;
  let nodeAKey, nodeBKey, nodeCKey, nodeDKey;
  beforeAll(() => {
    const NodeTypes = {
      Add: {
        inputs: {
          left: { type: number() },
          right: { type: number() },
        },
        outputs: {
          sum: ({ left, right }) => left + right,
        },
      },
      Subtract: {
        inputs: {
          left: { type: number() },
          right: { type: number() },
        },
        outputs: {
          difference: ({ left, right }) => left - right,
        },
      },
      Number: {
        sources: {
          number: { type: number() },
        },
      },
      Output: {
        inputs: {
          value: { type: any() },
        },
        outputs: {
          value: ({ value }) => value,
        },
      },
    };

    graph = new ProGraph(NodeTypes);
    graph.wipeAll();

    /**
     *  Goal is to model:
     *  D = A  B - C
     */

    // NODES

    nodeAKey = graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      sources: { number: 10 },
    });
    nodeBKey = graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      sources: { number: 5 },
    });
    nodeCKey = graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      sources: { number: 50 },
    });

    const addNodeKey = graph.addNode({
      type: "Add",
      position: { x: 0, y: 0 },
      sources: {},
    });

    const subtractNodeKey = graph.addNode({
      type: "Subtract",
      position: { x: 0, y: 0 },
      sources: {},
    });

    nodeDKey = graph.addNode({
      type: "Output",
      position: { x: 0, y: 0 },

      sources: { value: null },
    });

    // EDGES
    graph.addEdge({
      from: {
        nodeId: nodeAKey,
        busKey: "number",
      },
      to: {
        nodeId: addNodeKey,
        busKey: "left",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeBKey,
        busKey: "number",
      },
      to: {
        nodeId: addNodeKey,
        busKey: "right",
      },
    });

    graph.addEdge({
      from: {
        nodeId: addNodeKey,
        busKey: "sum",
      },
      to: {
        nodeId: subtractNodeKey,
        busKey: "left",
      },
    });

    graph.addEdge({
      from: {
        nodeId: nodeCKey,
        busKey: "number",
      },
      to: {
        nodeId: subtractNodeKey,
        busKey: "right",
      },
    });

    graph.addEdge({
      from: {
        nodeId: subtractNodeKey,
        busKey: "difference",
      },
      to: {
        nodeId: nodeDKey,
        busKey: "value",
      },
    });
  });

  it("can produce the correct output", () => {
    // D = A  B - C
    // 10  5 - 50 => -35
    graph.evaluate();

    const result = graph._nodes.get(nodeDKey);

    expect(graph._outputs[nodeDKey].value).toBe(-35);
  });

  it("will react to changes", () => {
    // D = A  B - C
    // 10  *15* - 50 => *-25*

    graph.updateNodeSource(nodeBKey, "number", 15);

    graph.evaluate();
    const result = graph._nodes.get(nodeDKey);

    expect(graph._outputs[nodeDKey].value).toBe(-25);
  });

  it("will support granular changes", () => {
    // D = A  B - C
    // 10  *-100* - 50 => *-140*

    graph.updateNodeSource(nodeBKey, "number", -100);

    graph.evaluate([nodeBKey]);
    const result = graph._nodes.get(nodeDKey);

    expect(graph._outputs[nodeDKey].value).toBe(-140);
  });
});

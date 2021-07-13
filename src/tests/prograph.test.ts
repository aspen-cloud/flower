import ProGraph from "../prograph";
import graphDB from "../graph-store";
import { any, number } from "superstruct";

describe("basic CRUD", () => {
  const graph = new ProGraph(graphDB, {
    TEST_NODE: {
      inputs: {
        input: any(),
      },
      outputs: {
        output: ({ input }) => input,
      },
    },
  });

  beforeEach(async () => {
    await graph.wipeAll();
  });

  test("can add and read nodes", async () => {
    const resp = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      values: [],
    });

    expect(resp).not.toBeNull();

    const allNodes = await graph.getAllNodes();
    expect(allNodes).toHaveLength(1);
  });

  test("can add and read edges", async () => {
    const node1 = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      values: [],
    });
    const node2 = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      values: [],
    });
    const resp = await graph.addEdge({
      from: {
        nodeId: +node1,
        busKey: "output",
      },
      to: {
        nodeId: +node2,
        busKey: "input",
      },
    });

    expect(resp).not.toBeNull();

    const allEdges = await graph.getAllEdges();
    expect(allEdges).toHaveLength(1);
  });

  test("can delete node and connected to edges", async () => {
    const nodeAKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "input",
      },
    });

    await graph.deleteNode(+nodeBKey);

    expect(await graph.getAllNodes()).toHaveLength(1);
    expect(await graph.getAllEdges()).toHaveLength(0);
  });
});

describe("topological sorting", () => {
  const graph = new ProGraph(graphDB, {
    TEST_NODE: {
      inputs: {
        input: any(),
      },
      outputs: {
        output: ({ input }) => input,
      },
    },
  });

  beforeEach(async () => {
    await graph.wipeAll();
  });

  it("correctly sorts simple graph", async () => {
    const nodeAKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const edgeResp = await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "input",
      },
    });

    const nodes = await graph.getTopologicallySortedNodes();
    expect(nodes.map((node) => node.id)).toEqual([nodeAKey, nodeBKey]);
  });

  it("correctly sorts complex graph", async () => {
    const nodeAKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeCKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeDKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeEKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeDKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeBKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeCKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeDKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeCKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "input",
      },
    });

    const nodes = await graph.getTopologicallySortedNodes();
    expect(nodes.map((node) => node.id)).toEqual([
      nodeAKey,
      nodeDKey,
      nodeBKey,
      nodeCKey,
      nodeEKey,
    ]);
    expect(nodes).toHaveLength(5);
  });

  it("correctly partials order based on seed", async () => {
    const nodeAKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeCKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeDKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeEKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeDKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeBKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeCKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeDKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "input",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeCKey,
        busKey: "output",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "input",
      },
    });

    const bDeps = await graph.getTopologicallySortedNodes([+nodeBKey]);
    expect(bDeps.map((node) => node.id)).toEqual([
      nodeBKey,
      nodeCKey,
      nodeEKey,
    ]);

    const aDeps = await graph.getTopologicallySortedNodes([+nodeAKey]);
    expect(aDeps.map((node) => node.id)).toEqual([
      nodeAKey,
      nodeDKey,
      nodeBKey,
      nodeCKey,
      nodeEKey,
    ]);

    const eDeps = await graph.getTopologicallySortedNodes([+nodeEKey]);
    expect(eDeps.map((node) => node.id)).toEqual([nodeEKey]);

    const cDeps = await graph.getTopologicallySortedNodes([+nodeCKey]);
    expect(cDeps.map((node) => node.id)).toEqual([nodeCKey, nodeEKey]);
  });
});

describe("Basic calculations", () => {
  let graph: ProGraph;
  let nodeAKey, nodeBKey, nodeCKey, nodeDKey;
  beforeAll(async () => {
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

    graph = new ProGraph(graphDB, NodeTypes);
    await graph.wipeAll();

    /**
     *  Goal is to model:
     *  D = A + B - C
     */

    // NODES

    nodeAKey = await graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      values: { number: 10 },
    });
    nodeBKey = await graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      values: { number: 5 },
    });
    nodeCKey = await graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      values: { number: 50 },
    });

    const addNodeKey = await graph.addNode({
      type: "Add",
      position: { x: 0, y: 0 },
      values: {},
    });

    const subtractNodeKey = await graph.addNode({
      type: "Subtract",
      position: { x: 0, y: 0 },
      values: {},
    });

    nodeDKey = await graph.addNode({
      type: "Output",
      position: { x: 0, y: 0 },

      values: { value: null },
    });

    // EDGES
    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "number",
      },
      to: {
        nodeId: +addNodeKey,
        busKey: "left",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeBKey,
        busKey: "number",
      },
      to: {
        nodeId: +addNodeKey,
        busKey: "right",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +addNodeKey,
        busKey: "sum",
      },
      to: {
        nodeId: +subtractNodeKey,
        busKey: "left",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeCKey,
        busKey: "number",
      },
      to: {
        nodeId: +subtractNodeKey,
        busKey: "right",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +subtractNodeKey,
        busKey: "difference",
      },
      to: {
        nodeId: +nodeDKey,
        busKey: "value",
      },
    });
  });

  it("can produce the correct output", async () => {
    // D = A + B - C
    // 10 + 5 - 50 => -35
    await graph.evaluate();

    const result = await graph.getNode(+nodeDKey);

    expect(result.values.value).toBe(-35);
  });

  it("will react to changes", async () => {
    // D = A + B - C
    // 10 + *15* - 50 => *-25*

    graph.updateNodeValue(nodeBKey, "number", 15);

    await graph.evaluate();
    const result = await graph.getNode(+nodeDKey);

    expect(result.values.value).toBe(-25);
  });

  it("will support granular changes", async () => {
    // D = A + B - C
    // 10 + *-100* - 50 => *-140*

    graph.updateNodeValue(nodeBKey, "number", -100);

    await graph.evaluate([nodeBKey]);
    const result = await graph.getNode(+nodeDKey);

    expect(result.values.value).toBe(-140);
  });
});

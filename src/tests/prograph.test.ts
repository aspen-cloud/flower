import ProGraph from "../prograph";
import graphDB from "../graph-store";
import { any, number } from "superstruct";

const graph = new ProGraph(graphDB);

beforeEach(async () => {
  await graph.wipeAll();
});

describe("basic CRUD", () => {
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
    const resp = await graph.addEdge({
      from: {
        nodeId: 1,
        busKey: "testOutput",
      },
      to: {
        nodeId: 2,
        busKey: "testInput",
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
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "testInput",
      },
    });

    await graph.deleteNode(+nodeBKey);

    expect(await graph.getAllNodes()).toHaveLength(1);
    expect(await graph.getAllEdges()).toHaveLength(0);
  });
});

describe("topological sorting", () => {
  it("correctly sorts simple graph", async () => {
    const nodeAKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "OTHER_TEST_NODE",
      position: { x: 0, y: 0 },

      values: [],
    });
    const edgeResp = await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "testInput",
      },
    });

    const nodes = await graph.getTopologicallySortedNodes();
    expect(nodes.map((node) => node.id)).toEqual([nodeAKey, nodeBKey]);
  });

  it("correctly sorts complex graph", async () => {
    const nodeAKey = await graph.addNode({
      type: "NodeA",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "NodeB",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeCKey = await graph.addNode({
      type: "NodeC",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeDKey = await graph.addNode({
      type: "NodeD",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeEKey = await graph.addNode({
      type: "NodeE",
      position: { x: 0, y: 0 },

      values: [],
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeDKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeBKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeCKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeDKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeCKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "testInput",
      },
    });

    const nodes = await graph.getTopologicallySortedNodes();
    expect(nodes.map((node) => node.type)).toEqual([
      "NodeA",
      "NodeD",
      "NodeB",
      "NodeC",
      "NodeE",
    ]);
    expect(nodes).toHaveLength(5);
  });

  it("correctly partials order based on seed", async () => {
    const nodeAKey = await graph.addNode({
      type: "NodeA",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeBKey = await graph.addNode({
      type: "NodeB",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeCKey = await graph.addNode({
      type: "NodeC",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeDKey = await graph.addNode({
      type: "NodeD",
      position: { x: 0, y: 0 },

      values: [],
    });
    const nodeEKey = await graph.addNode({
      type: "NodeE",
      position: { x: 0, y: 0 },

      values: [],
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeBKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeAKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeDKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeBKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeCKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeDKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "testInput",
      },
    });

    await graph.addEdge({
      from: {
        nodeId: +nodeCKey,
        busKey: "testOutput",
      },
      to: {
        nodeId: +nodeEKey,
        busKey: "testInput",
      },
    });

    const bDeps = await graph.getTopologicallySortedNodes([+nodeBKey]);
    expect(bDeps.map((node) => node.type)).toEqual(["NodeB", "NodeC", "NodeE"]);

    const aDeps = await graph.getTopologicallySortedNodes([+nodeAKey]);
    expect(aDeps.map((node) => node.type)).toEqual([
      "NodeA",
      "NodeD",
      "NodeB",
      "NodeC",
      "NodeE",
    ]);

    const eDeps = await graph.getTopologicallySortedNodes([+nodeEKey]);
    expect(eDeps.map((node) => node.type)).toEqual(["NodeE"]);

    const cDeps = await graph.getTopologicallySortedNodes([+nodeCKey]);
    expect(cDeps.map((node) => node.type)).toEqual(["NodeC", "NodeE"]);
  });
});

describe("Basic calculations", () => {
  it("can produce the correct output", async () => {
    /**
     *  Goal is to model:
     *  D = A + B - C
     */

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

    // NODES

    const nodeAKey = await graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      values: { number: 10 },
    });
    const nodeBKey = await graph.addNode({
      type: "Number",
      position: { x: 0, y: 0 },

      values: { number: 5 },
    });
    const nodeCKey = await graph.addNode({
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

    const nodeDKey = await graph.addNode({
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

    // EVALUATE

    const sorting = await graph.getTopologicallySortedNodes();

    for (const node of sorting) {
      const nodeClass = NodeTypes[node.type];
      if (!nodeClass.inputs || nodeClass.inputs.length === 0) continue;
      const inputVals = await graph.getNodeInputs(node.id);

      for (const outputKey in nodeClass.outputs) {
        const newVal = nodeClass.outputs[outputKey](inputVals);
        await graph.updateNodeValue(node.id, outputKey, newVal);
      }
    }

    const result = await graph.getNode(+nodeDKey);

    expect(result.values.value).not.toBeNull();
  });
});

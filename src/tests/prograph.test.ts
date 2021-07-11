import ProGraph from "../prograph";
import graphDB from "../graph-store";

const graph = new ProGraph(graphDB);

beforeEach(async () => {
  await graph.wipeAll();
});

describe("basic CRUD", () => {
  test("can add and read nodes", async () => {
    const resp = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
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
      inputs: [],
      outputs: [],
    });
    const nodeBKey = await graph.addNode({
      type: "TEST_NODE",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
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
      inputs: [],
      outputs: [],
    });
    const nodeBKey = await graph.addNode({
      type: "OTHER_TEST_NODE",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
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
      inputs: [],
      outputs: [],
    });
    const nodeBKey = await graph.addNode({
      type: "NodeB",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
    const nodeCKey = await graph.addNode({
      type: "NodeC",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
    const nodeDKey = await graph.addNode({
      type: "NodeD",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
    const nodeEKey = await graph.addNode({
      type: "NodeE",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
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
      inputs: [],
      outputs: [],
    });
    const nodeBKey = await graph.addNode({
      type: "NodeB",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
    const nodeCKey = await graph.addNode({
      type: "NodeC",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
    const nodeDKey = await graph.addNode({
      type: "NodeD",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    });
    const nodeEKey = await graph.addNode({
      type: "NodeE",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
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

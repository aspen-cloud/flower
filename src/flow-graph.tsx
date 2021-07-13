import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  DragEventHandler,
} from "react";
import XLSX from "xlsx";

import ReactFlow, {
  updateEdge,
  getConnectedEdges,
  Controls,
  Background,
  isEdge,
  Elements,
  FlowElement,
  OnEdgeUpdateFunc,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  PanOnScrollMode,
  XYPosition,
  OnLoadFunc,
  OnLoadParams,
  isNode,
} from "react-flow-renderer";
import * as AllNodes from "./graph-nodes/index";

import { ItemPredicate, ItemRenderer, Omnibar } from "@blueprintjs/select";
import {
  HotkeysTarget2,
  MenuItem,
  ContextMenu,
  Menu,
  Icon,
  Drawer,
  DrawerSize,
  Classes,
  Collapse,
  Card,
} from "@blueprintjs/core";

import { OmnibarItem } from "./types";
import Graph, { connectionToJson, nodeToJson, persistGraph } from "./graph";
import { autorun } from "mobx";
import { jsonToTable, matrixToTable } from "./utils/tables";
import { csvToJson } from "./utils/files";
import { isWritableElement } from "./utils/elements";
import {
  addElementsToClipboard,
  ClipboardParseResult,
  ElementClipboardContext,
  parseClipboard,
} from "./utils/clipboard";
import { GraphEdge, GraphNode } from "./graph-store";
import { combineLatest } from "rxjs";
import ProGraph from "./prograph";
import graphDB from "./graph-store";
import { map } from "rxjs/operators";

const onElementClick = (event: React.MouseEvent, element: Node | Edge) => {};

const initBgColor = "#343434";

const connectionLineStyle = { stroke: "#fff" };
const snapGrid: [number, number] = [20, 20];

function flattenNodes(nodes: Record<string, any>): [string, any][] {
  return Object.entries(nodes).flatMap(([key, val]) =>
    val.Component ? [[key, val]] : flattenNodes(val),
  );
}

const GraphNodes = Object.fromEntries(flattenNodes(AllNodes));

const nodeTypes = Object.fromEntries(
  Object.entries(GraphNodes).map(([key, val]) => [key, val.Component]),
);
const defaultOmnibarOptions = Object.keys(nodeTypes).map((t) => ({
  type: t,
  label: t,
  data: {},
}));

const ElementInfoMenuItem = ({ element }: { element: FlowElement }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div onClick={() => setIsOpen((wasOpen) => !wasOpen)}>
        <b>
          <Icon icon={isOpen ? "caret-down" : "caret-right"} /> {element.id}
        </b>
      </div>
      <Collapse isOpen={isOpen}>
        <Card>
          <div>
            <b>Type:</b> {element.type}
          </div>
        </Card>
      </Collapse>
    </>
  );
};

function getComponentDataForNode(node) {
  const nodeClass = GraphNodes[node.type];
  const sourceKeys = nodeClass.sources ? Object.keys(nodeClass.sources) : [];
  const outputKeys = nodeClass.outputs ? Object.keys(nodeClass.outputs) : [];

  const inputs = nodeClass.inputs;

  const sources = sourceKeys.reduce((acc, curr) => {
    acc[curr] = {
      value: node.values[curr],
      set: (newVal) => proGraph.updateNodeValue(node.id, curr, newVal),
    };
    return acc;
  }, {});
  const outputs = outputKeys.reduce((acc, curr) => {
    acc[curr] = node.values[curr];
    return acc;
  }, {});

  // TODO possibly include input values
  return {
    inputs,
    sources,
    outputs,
  };
}

function graphToReactFlow(
  nodes: Map<number, GraphNode>,
  edges: Map<number, GraphEdge>,
): Elements {
  const flowNodes: Node[] = Array.from(nodes.values()).map((node) => ({
    position: node.position,
    // TODO pass in Graph Values
    data: getComponentDataForNode(node),
    type: node.type,
    id: node.id.toString(),
    style: {
      padding: "10px",
      border: "1px solid white",
      borderRadius: "10px",
    },
  }));

  const flowEdges: Edge[] = Array.from(edges.values()).map((conn) => ({
    id: conn.id.toString(),
    source: conn.from.nodeId.toString(),
    sourceHandle: conn.from.busKey,
    target: conn.to.nodeId.toString(),
    targetHandle: conn.to.busKey,
  }));
  return [...flowNodes, ...flowEdges];
}

const proGraph = new ProGraph(graphDB, GraphNodes);
console.log("graph", proGraph);

const flowElements$ = combineLatest(proGraph.nodes$, proGraph.edges$).pipe(
  map(([nodes, edges]) => graphToReactFlow(nodes, edges)),
);

const FlowGraph = () => {
  const [reactflowInstance, setReactflowInstance] =
    useState<OnLoadParams | null>(null);
  const [elements, setElements] = useState<Elements>();
  const [bgColor, setBgColor] = useState(initBgColor);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Elements>([]);
  const [omnibarQuery, setOmnibarQuery] = useState("");
  const [nodeTypeList, setNodeTypeList] = useState<OmnibarItem[]>(
    defaultOmnibarOptions,
  );

  useEffect(() => {
    if (omnibarQuery) {
      setNodeTypeList([
        ...defaultOmnibarOptions,
        {
          type: "Constant",
          label: `Constant: ${omnibarQuery}`,
          data: { value: omnibarQuery },
        },
      ]);
    } else {
      setNodeTypeList([...defaultOmnibarOptions]);
    }
  }, [omnibarQuery]);

  // TODO remove in favor of prograph
  const graphRef = useRef<Graph>();

  useEffect(() => {
    const subscription = flowElements$.subscribe((els) => {
      setElements(els);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const validateConnection = (
    connection: Connection | Edge<any>,
    els: Elements,
  ) => {
    /**
     * There are hooks on initial connection to a handle to check if the connection is valid
     * - https://reactflow.dev/docs/api/handle/
     * Unfortunately, this is not available on an edge update
     * - https://github.com/wbkd/react-flow/issues/1034
     *
     * Manually enforcing that on connections/updates that no other incoming edges exist for that handle
     * That may not always be the case, but for now that seems correct
     */

    const target = els.find(({ id }) => id === connection.target) as Node<any>;
    if (!target) return false;
    const edges = els.filter((el) => isEdge(el)) as Edge<any>[];
    const handleEdges = getConnectedEdges([target], edges).filter(
      (edge) =>
        edge.target === target.id &&
        edge.targetHandle === connection.targetHandle,
    );

    if (handleEdges.length >= 1) {
      console.log("INVALID: ALREADY AN EDGE ON THIS HANDLE");
      return false;
    }

    return true;
  };

  const getEdgeStreams = (edge: Connection | Edge<any>, els: Elements) => {
    const sourceNode = els.find(({ id }) => id === edge.source);
    const targetNode = els.find(({ id }) => id === edge.target);
    const sourceOutput = sourceNode!.data.sinks[edge.sourceHandle!];
    const targetInput = targetNode!.data.sources[edge.targetHandle!];

    return [sourceOutput, targetInput];
  };

  const onEdgeConnect = (edge: Connection | Edge<any>, els: Elements) => {
    const [sourceOutput, targetInput] = getEdgeStreams(edge, els);
    sourceOutput.subscribe((latestVal: any) => {
      targetInput.next(latestVal);
    });
  };

  const onEdgeDisconnect = (edge: Connection | Edge<any>, els: Elements) => {
    const [sourceOutput, targetInput] = getEdgeStreams(edge, els);
    // TODO fix for RXJS
  };

  const onConnect = (connection: Connection | Edge<any>) => {
    proGraph.addEdge({
      from: {
        nodeId: +connection.source,
        busKey: connection.sourceHandle,
      },
      to: {
        nodeId: +connection.target,
        busKey: connection.targetHandle,
      },
    });
  };

  const onElementsRemove = (elementsToRemove: Elements) => {
    for (const el of elementsToRemove) {
      if (isEdge(el)) {
        proGraph.deleteEdge(+el.id);
      } else {
        proGraph.deleteNode(+el.id);
      }
    }
  };

  const onEdgeUpdate: OnEdgeUpdateFunc<any> = (oldEdge, newConnection) => {
    setElements((els) => {
      if (!validateConnection(newConnection, els)) return els;
      onEdgeDisconnect(oldEdge, els);
      onEdgeConnect(newConnection, els);
      return updateEdge(oldEdge, newConnection, els);
    });
  };

  const addNode = useCallback(({ type, data, position }) => {
    // @ts-ignore
    const { outputs, sources } = GraphNodes[type];
    const values = Object.fromEntries(
      [
        ...(outputs ? Object.keys(outputs) : []),
        ...(sources ? Object.keys(sources) : []),
      ].map((key) => [
        key,
        null, // TODO use default value from Node definition
      ]),
    );
    proGraph.addNode({ type, position, values });
  }, []);

  const onLoad: OnLoadFunc<any> = useCallback(
    (rfi) => {
      if (!reactflowInstance) {
        setReactflowInstance(rfi);
        newFunction()("flow loaded:", rfi);

        // zoom to previous state if available
        const canvasPosition = localStorage.getItem("flowgraph-state");
        if (canvasPosition) {
          rfi.setTransform(JSON.parse(canvasPosition));
        } else {
          rfi?.fitView();
        }
      }
    },
    [reactflowInstance],
  );

  function parseFileData(file: File, callback: (data: any) => void) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const json_data = XLSX.utils.sheet_to_json(
        workbook.Sheets[Object.keys(workbook.Sheets)[0]], // todo: Possibly load all "Sheets" as separate data sources?
        { raw: false },
      );
      callback(json_data);
    };
    reader.readAsArrayBuffer(file);
  }

  async function addFileNode(entry, label: string, position: XYPosition) {
    const file = await entry.getFile();
    const jsonData = await csvToJson(file);
    const tableData = jsonToTable(jsonData);

    graphRef.current?.createNode({
      type: "FileSource",
      data: {
        data: tableData,
        entry,
        lastRead: file,
      },
      position,
    });
  }

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
    event.preventDefault();
    if (reactFlowWrapper.current == null || reactflowInstance == null) return;
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    // const type = event.dataTransfer.getData("application/reactflow");
    const position = reactflowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    //@ts-ignore
    for (const item of event.dataTransfer.items) {
      if (item.kind === "file") {
        const entry = await item.getAsFileSystemHandle();
        console.log("ENTRY", entry);
        if (entry.kind === "file") {
          await addFileNode(entry, entry.name, position);
        } else if (entry.kind === "directory") {
          // run code for is entry is a directory
        }
      }
    }

    // const file = event.dataTransfer.files[0];
    // parseFileData(file, (json_data) => {
    //   addDataNode(json_data, file.name, position);
    // });
  };

  const getCanvasPosition = useCallback(
    (position: XYPosition) => {
      if (reactFlowWrapper.current == null || reactflowInstance == null)
        return { x: 0, y: 0 };

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      return reactflowInstance.project({
        x: position.x - reactFlowBounds.left,
        y: position.y - reactFlowBounds.top,
      });
    },
    [reactflowInstance],
  );

  // Add listeners for copy and pasting into graph
  const copyElements = async (els: Elements<any>) => {
    const serializedNodes = els
      .filter((el) => isNode(el))
      .map((el) => proGraph.nodes.get(+el.id));
    const serializedEdges = els
      .filter((el) => isEdge(el))
      .map((el) => proGraph.edges.get(+el.id));
    // @ts-ignore
    await addElementsToClipboard(serializedNodes, serializedEdges);
  };

  useEffect(() => {
    const copyHandler = async (event: ClipboardEvent) => {
      const isWritable = isWritableElement(event.target);
      // default prevented as proxy for spreadsheet cell copies
      if (!isWritable && !event.defaultPrevented) {
        event.preventDefault();
        await copyElements(selectedElements);
      }
    };
    document.body.addEventListener("copy", copyHandler);
    return () => {
      document.body.removeEventListener("copy", copyHandler);
    };
  }, [selectedElements]);

  const mousePosition = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  useEffect(() => {
    const mouseMoveHandler = (event: MouseEvent) => {
      mousePosition.current = { x: event.clientX, y: event.clientY };
    };
    document.body.addEventListener("mousemove", mouseMoveHandler);

    return () => {
      document.body.removeEventListener("mousemove", mouseMoveHandler);
    };
  }, []);

  const pasteData = async (
    clipboardResult: ClipboardParseResult,
    position: XYPosition,
  ) => {
    const { type, data } = clipboardResult;
    if (type === "text") {
      addNode({
        type: "Constant",
        data: {
          value: data,
        },
        position,
      });
    }

    if (type === "table") {
      const tableData = jsonToTable(data);
      addNode({
        type: "DataSource",
        data: {
          data: tableData,
        },
        position,
      });
    }

    // TODO: less logic in flowgraph
    if (type === "nodes") {
      const clipboardElements = data as ElementClipboardContext[];
      const clipboardNodes = clipboardElements.filter(
        (clipboardElement) => clipboardElement.element.position,
      );
      const clipboardEdges = clipboardElements.filter(
        (clipboardElement) => !clipboardElement.element.position,
      );

      const newNodes = await Promise.all(
        clipboardNodes.map((clipboardNode) =>
          proGraph.addNode({
            type: clipboardNode.element.type,
            values: clipboardNode.element.values,
            position: {
              x: position.x + clipboardNode.xOffset,
              y: position.y + clipboardNode.yOffset,
            },
          }),
        ),
      );

      const newNodesMap = new Map(
        newNodes.map((newNodeId, i) => [
          clipboardNodes[i].element.id,
          newNodeId,
        ]),
      );

      for (const edge of clipboardEdges) {
        if (
          newNodesMap.get(edge.element.to.nodeId) &&
          newNodesMap.get(edge.element.from.nodeId)
        ) {
          proGraph.addEdge({
            from: {
              nodeId: +newNodesMap.get(edge.element.from.nodeId),
              busKey: edge.element.from.busKey,
            },
            to: {
              nodeId: +newNodesMap.get(edge.element.to.nodeId),
              busKey: edge.element.to.busKey,
            },
          });
        }
      }
    }
  };

  useEffect(() => {
    const pasteHandler = async (event: ClipboardEvent) => {
      const isWritable = isWritableElement(event.target);
      // default prevented as proxy for spreadsheet cell pastes
      if (event.clipboardData && !isWritable && !event.defaultPrevented) {
        event.preventDefault();
        pasteData(
          await parseClipboard(event),
          getCanvasPosition(mousePosition.current),
        );
      }
    };
    document.body.addEventListener("paste", pasteHandler);
    return () => {
      document.body.removeEventListener("paste", pasteHandler);
    };
  }, [getCanvasPosition]);

  // Prevent document zoom from firing (would happen on nowheel nodes), causes full page to zoom
  useEffect(() => {
    const wheelHandler = function (e) {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("wheel", wheelHandler, { passive: false });
    return () => {
      document.body.removeEventListener("wheel", wheelHandler);
    };
  }, []);

  const NodeOmnibar = Omnibar.ofType<OmnibarItem>();

  const [showNodeOmniBar, setShowNodeOmniBar] = useState(false);

  const renderNodeType: ItemRenderer<OmnibarItem> = (
    item,
    { handleClick, modifiers, query },
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        label={item.label}
        key={item.label}
        onClick={handleClick}
        text={item.label}
      />
    );
  };

  const filterNodeTypes: ItemPredicate<OmnibarItem> = (
    query,
    item,
    _index,
    exactMatch,
  ) => {
    const normalizedTitle = item.label.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    if (!query || query.length === 0) return true;
    if (exactMatch) {
      return normalizedTitle === normalizedQuery;
    } else {
      return normalizedTitle.indexOf(normalizedQuery) >= 0;
    }
  };

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
      {elements && ( // Don't load react flow until elements are ready
        <ReactFlow
          elements={elements}
          panOnScroll={true}
          panOnScrollMode={PanOnScrollMode.Free}
          onElementClick={onElementClick}
          onElementsRemove={onElementsRemove}
          onConnect={onConnect}
          style={{ background: bgColor }}
          onDoubleClick={() => {
            console.log("double clicked...");
          }}
          onLoad={onLoad}
          nodeTypes={nodeTypes}
          connectionLineStyle={connectionLineStyle}
          snapToGrid={true}
          snapGrid={snapGrid}
          defaultZoom={1}
          onDrop={onDrop}
          onNodeDragStart={(event, node) => {
            if (event.altKey) {
              // Using selected elements because multiselect is tied to onNode events
              graphRef.current?.replaceElementGroup(
                selectedElements.map((el) => el.id),
              );
            }
          }}
          onSelectionDragStart={async (event, nodes) => {
            if (event.altKey) {
              // Using selected elements because edges are not included
              graphRef.current?.replaceElementGroup(
                selectedElements.map((el) => el.id),
              );
            }
          }}
          onNodeDragStop={(e, node) => {
            proGraph.moveNode(+node.id, node.position);
          }}
          onSelectionDragStop={(e, nodes) => {
            for (const node of nodes) {
              proGraph.moveNode(+node.id, node.position);
            }
          }}
          onDragOver={onDragOver}
          onEdgeUpdate={onEdgeUpdate}
          onSelectionChange={(elements) => {
            setSelectedElements(elements || []);
          }}
          onNodeContextMenu={(event, node) => {
            // @ts-ignore
            if (event.target.closest(".base-node-content")) return;

            event.preventDefault();
            const menu = (
              <Menu>
                <MenuItem
                  onClick={async () => await copyElements([node])}
                  text="Copy node"
                />
                <MenuItem
                  onClick={() => onElementsRemove([node])}
                  text="Delete node"
                />
              </Menu>
            );
            ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
          }}
          onEdgeContextMenu={(event, edge) => {
            event.preventDefault();
            const menu = (
              <Menu>
                <MenuItem
                  onClick={() => onElementsRemove([edge])}
                  text="Delete edge"
                />
              </Menu>
            );
            ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
          }}
          onSelectionContextMenu={(event, nodes) => {
            event.preventDefault();
            const menu = (
              <Menu>
                <MenuItem
                  onClick={async () => await copyElements(nodes)}
                  text="Copy nodes"
                />
                <MenuItem
                  onClick={() => onElementsRemove(nodes)}
                  text="Delete nodes"
                />
              </Menu>
            );
            ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
          }}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            const menu = (
              <Menu>
                <MenuItem
                  onClick={() => reactflowInstance?.fitView()}
                  text="Zoom to fit"
                />
                <MenuItem
                  onClick={async (e: React.MouseEvent) =>
                    pasteData(
                      await parseClipboard(null),
                      getCanvasPosition({
                        x: event.clientX,
                        y: event.clientY,
                      }),
                    )
                  }
                  text="Paste"
                />
              </Menu>
            );
            ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
          }}
          edgeUpdaterRadius={35}
          onMoveEnd={(flowTransform) =>
            localStorage.setItem(
              "flowgraph-state",
              JSON.stringify(flowTransform),
            )
          }
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          {!sideMenuOpen ? (
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "white",
                borderRadius: "100%",
                zIndex: 1000,
              }}
              onClick={() => setSideMenuOpen(true)}
            >
              <Icon icon="double-chevron-left" iconSize={20} />
            </div>
          ) : (
            ""
          )}

          <Drawer
            icon="multi-select"
            onClose={() => setSideMenuOpen(false)}
            title="Selected Elements"
            isOpen={sideMenuOpen}
            size={DrawerSize.SMALL}
            hasBackdrop={false}
            canOutsideClickClose={false}
            canEscapeKeyClose={false}
            enforceFocus={false}
            portalClassName="info-sidebar"
          >
            <div className={Classes.DRAWER_BODY}>
              <div className={Classes.DIALOG_BODY}>
                {selectedElements.length ? (
                  selectedElements.map((el, i) => (
                    <ElementInfoMenuItem key={i} element={el} />
                  ))
                ) : (
                  <div>No elements selected.</div>
                )}
              </div>
            </div>
          </Drawer>
        </ReactFlow>
      )}
      <HotkeysTarget2
        hotkeys={[
          {
            combo: "n",
            global: true,
            label: "Show Omnibar",
            allowInInput: false,
            onKeyDown: () => {
              console.log("hot key pressed");
              setShowNodeOmniBar(true);
            },
            preventDefault: true,
          },
        ]}
      >
        <NodeOmnibar
          noResults={<MenuItem disabled={true} text="No results." />}
          items={nodeTypeList}
          query={omnibarQuery}
          onQueryChange={(q, _event) => setOmnibarQuery(q)}
          itemRenderer={renderNodeType}
          itemPredicate={filterNodeTypes}
          onItemSelect={(item) => {
            const { type, data } = item;
            addNode({
              type,
              data,
              position: getCanvasPosition(mousePosition.current),
            });
            setShowNodeOmniBar(false);
          }}
          onClose={() => {
            setShowNodeOmniBar(false);
          }}
          isOpen={showNodeOmniBar}
          resetOnSelect={true}
        />
      </HotkeysTarget2>
    </div>
  );
};

export default FlowGraph;
function newFunction() {
  return console.log;
}

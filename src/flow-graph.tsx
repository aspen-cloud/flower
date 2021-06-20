import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  DragEventHandler,
} from "react";
import XLSX from "xlsx";
import { nanoid } from "nanoid";

import ReactFlow, {
  removeElements,
  addEdge,
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
  Position,
  XYPosition,
  OnLoadFunc,
  OnLoadParams,
} from "react-flow-renderer";
import * as AllNodes from "./graph-nodes/index";

import testData from "./test-data";
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
console.log(AllNodes, GraphNodes);

const nodeTypes = Object.fromEntries(
  Object.entries(GraphNodes).map(([key, val]) => [key, val.Component]),
);

const columns = [
  {
    Header: "Address",
    accessor: "address",
  },
  {
    Header: "Price",
    accessor: "price",
  },
  {
    Header: "Size (SqrFt)",
    accessor: "sqrft",
  },
];

function createReactFlowNode({
  type,
  data,
  position,
}: {
  type: string;
  data?: any;
  position: { x: number; y: number };
}) {
  return {
    id: nanoid(),
    type,
    data: GraphNodes[type].initializeStreams({ initialData: data }),
    position,
    style: { padding: "10px", border: "1px solid white", borderRadius: "10px" },
  };
}

const nodes = [
  createReactFlowNode({
    type: "DataSource",
    data: {
      data: {
        rows: testData,
        columns,
      },
      label: "TestData",
    },
    position: { x: 100, y: -200 },
  }),
  createReactFlowNode({
    type: "Table",
    position: { x: 100, y: -100 },
  }),
  createReactFlowNode({
    type: "ColumnGenerator",
    position: { x: 0, y: 0 },
  }),
  createReactFlowNode({
    type: "Table",
    position: { x: 0, y: 300 },
  }),
  createReactFlowNode({
    type: "AvgColumn",
    position: { x: 110, y: -150 },
  }),
  createReactFlowNode({
    type: "SingleCell",
    position: { x: 130, y: -130 },
  }),
];

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

const FlowGraph = () => {
  const [reactflowInstance, setReactflowInstance] =
    useState<OnLoadParams | null>(null);
  const [elements, setElements] = useState<Elements>(nodes);
  const [bgColor, setBgColor] = useState(initBgColor);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Elements>([]);

  // useEffect(() => {
  //   if (reactflowInstance && elements.length > 0) {
  //     //reactflowInstance.fitView();
  //   }
  // }, [reactflowInstance, elements.length]);

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
    setElements((els) => {
      if (!validateConnection(connection, els)) return els;
      onEdgeConnect(connection, els);
      return addEdge(
        { ...connection, animated: true, style: { stroke: "#fff" } },
        els,
      );
    });
  };

  const onElementsRemove = (elementsToRemove: Elements) => {
    setElements((els) => {
      for (const el of elementsToRemove) {
        if (isEdge(el)) {
          onEdgeDisconnect(el, els);
        }
      }
      return removeElements(elementsToRemove, els);
    });
  };

  const onEdgeUpdate: OnEdgeUpdateFunc<any> = (oldEdge, newConnection) => {
    setElements((els) => {
      if (!validateConnection(newConnection, els)) return els;
      onEdgeDisconnect(oldEdge, els);
      onEdgeConnect(newConnection, els);
      return updateEdge(oldEdge, newConnection, els);
    });
  };

  const addNode = useCallback(({ type, position }) => {
    const newNode = createReactFlowNode({ type, position });
    setElements((prevElems) => [...prevElems, newNode]);
  }, []);

  const onLoad: OnLoadFunc<any> = useCallback(
    (rfi) => {
      if (!reactflowInstance) {
        setReactflowInstance(rfi);
        newFunction()("flow loaded:", rfi);
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

  function addDataNode(data: any[], label: string, position: XYPosition) {
    const cols = Object.keys(data.length ? data[0] : {}).map((col) => ({
      Header: col,
      accessor: col,
    }));

    const newEl = createReactFlowNode({
      type: "DataSource",
      data: {
        data: {
          rows: data,
          columns: cols,
        },
        label,
      },
      position,
    });

    setElements((els) => [...els, newEl]);
  }

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    if (reactFlowWrapper.current == null || reactflowInstance == null) return;
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    // const type = event.dataTransfer.getData("application/reactflow");
    const position = reactflowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });
    const file = event.dataTransfer.files[0];
    parseFileData(file, (json_data) => {
      addDataNode(json_data, file.name, position);
    });
  };

  const NodeOmnibar = Omnibar.ofType<[string, string]>();

  const [showNodeOmniBar, setShowNodeOmniBar] = useState(false);

  const renderNodeType: ItemRenderer<[string, any]> = (
    [key, component],
    { handleClick, modifiers, query },
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        label={key}
        key={key}
        onClick={handleClick}
        text={key}
      />
    );
  };

  const filterNodeTypes: ItemPredicate<[string, any]> = (
    query,
    [key, component],
    _index,
    exactMatch,
  ) => {
    const normalizedTitle = key.toLowerCase();
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
        onDragOver={onDragOver}
        onEdgeUpdate={onEdgeUpdate}
        onSelectionChange={(elements) => {
          setSelectedElements(elements || []);
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          const menu = React.createElement(
            Menu,
            {},
            React.createElement(MenuItem, {
              onClick: () => onElementsRemove([node]),
              text: "Delete node",
            }),
          );
          ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
        }}
        onEdgeContextMenu={(event, edge) => {
          event.preventDefault();
          const menu = React.createElement(
            Menu,
            {},
            React.createElement(MenuItem, {
              onClick: () => onElementsRemove([edge]),
              text: "Delete edge",
            }),
          );
          ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
        }}
        onSelectionContextMenu={(event, nodes) => {
          event.preventDefault();
          const menu = React.createElement(
            Menu,
            {},
            React.createElement(MenuItem, {
              onClick: () => onElementsRemove(nodes),
              text: "Delete nodes",
            }),
          );
          ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
        }}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          const menu = React.createElement(
            Menu,
            {},
            React.createElement(MenuItem, {
              onClick: () => reactflowInstance?.fitView(),
              text: "Zoom to fit",
            }),
          );
          ContextMenu.show(menu, { left: event.clientX, top: event.clientY });
        }}
        edgeUpdaterRadius={35}
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
      <HotkeysTarget2
        hotkeys={[
          {
            combo: "n",
            global: true,
            label: "Show Omnibar",
            onKeyDown: () => {
              console.log("hot key pressed");
              setShowNodeOmniBar(true);
            },
            // prevent typing "O" in omnibar input
            preventDefault: true,
          },
        ]}
      >
        <NodeOmnibar
          noResults={<MenuItem disabled={true} text="No results." />}
          items={Object.entries(nodeTypes) as [string, string][]}
          itemRenderer={renderNodeType}
          itemPredicate={filterNodeTypes}
          onItemSelect={([type]) => {
            addNode({ type, position: { x: 0, y: 0 } });
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

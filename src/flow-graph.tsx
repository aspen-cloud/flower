import React, { useState, useEffect, useCallback, useRef } from "react";
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
  PanOnScrollMode,
  BackgroundVariant,
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

// const onElementClick = (event, element) => {};

const initBgColor = "#343434";

const connectionLineStyle = { stroke: "#fff" };
const snapGrid = [20, 20];

function flattenNodes(nodes) {
  return Object.entries(nodes).flatMap(([key, val]) =>
    // @ts-ignore
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
  // TODO remove... just for testing
  // if (type === "DataSource") {
  //   data = {
  //     rows: testData,
  //     columns
  //   };
  // }
  return {
    id: nanoid(),
    type,
    data: GraphNodes[type].initializeStreams({ initialData: data }),
    position,
    style: { padding: "10px", border: "1px solid white", borderRadius: "10px" },
  };
}

async function createReactFlowNodeAsync({
  type,
  data,
  position,
}: {
  type: string;
  data?: any;
  position: { x: number; y: number };
}) {
  // TODO remove... just for testing
  // if (type === "DataSource") {
  //   data = {
  //     rows: testData,
  //     columns
  //   };
  // }
  return {
    id: nanoid(),
    type,
    data: await GraphNodes[type].initializeStreams({ initialData: data }),
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

const ElementInfoMenuItem = ({ element }) => {
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

interface FilePollInfo {
  fileHandle: any;
  pollId: number;
  lastUpdated: number;
}

const FlowGraph = () => {
  const [reactflowInstance, setReactflowInstance] = useState(null);
  const [elements, setElements] = useState(nodes);
  const [bgColor, setBgColor] = useState(initBgColor);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState([]);
  const filePollsRef = useRef<FilePollInfo[]>([]);
  // const [filePolls, setFilePolls] = useState<FilePollInfo[]>([]);

  // const dictionary: { [fileId: string]: string } = {
  //   a: "foo",
  //   b: "bar",
  // };

  // useEffect(() => {
  //   if (reactflowInstance && elements.length > 0) {
  //     //reactflowInstance.fitView();
  //   }
  // }, [reactflowInstance, elements.length]);

  const validateConnection = (connection, els) => {
    /**
     * There are hooks on initial connection to a handle to check if the connection is valid
     * - https://reactflow.dev/docs/api/handle/
     * Unfortunately, this is not available on an edge update
     * - https://github.com/wbkd/react-flow/issues/1034
     *
     * Manually enforcing that on connections/updates that no other incoming edges exist for that handle
     * That may not always be the case, but for now that seems correct
     */

    const target = els.find(({ id }) => id === connection.target);
    const edges = els.filter((el) => isEdge(el));
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

  const getEdgeStreams = (edge, els) => {
    const sourceNode = els.find(({ id }) => id === edge.source);
    const targetNode = els.find(({ id }) => id === edge.target);
    const sourceOutput = sourceNode!.data.sinks[edge.sourceHandle];
    const targetInput = targetNode!.data.sources[edge.targetHandle];

    return [sourceOutput, targetInput];
  };

  const onEdgeConnect = (edge, els) => {
    const [sourceOutput, targetInput] = getEdgeStreams(edge, els);
    targetInput.plug(sourceOutput);
  };

  const onEdgeDisconnect = (edge, els) => {
    const [sourceOutput, targetInput] = getEdgeStreams(edge, els);
    targetInput.emit(null);
    targetInput.unplug(sourceOutput);
  };

  const onConnect = (connection) => {
    // @ts-ignore
    setElements((els) => {
      if (!validateConnection(connection, els)) return els;
      onEdgeConnect(connection, els);
      return addEdge(
        { ...connection, animated: true, style: { stroke: "#fff" } },
        els,
      );
    });
  };

  const onElementsRemove = (elementsToRemove) => {
    // @ts-ignore
    setElements((els) => {
      for (const el of elementsToRemove) {
        if (isEdge(el)) {
          onEdgeDisconnect(el, els);
        }
      }
      return removeElements(elementsToRemove, els);
    });
  };

  const onEdgeUpdate = (oldEdge, newConnection) => {
    // @ts-ignore
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

  const onLoad = useCallback(
    (rfi) => {
      if (!reactflowInstance) {
        setReactflowInstance(rfi);
        newFunction()("flow loaded:", rfi);
      }
    },
    [reactflowInstance],
  );

  function parseFileData(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
      // @ts-ignore
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const json_data = XLSX.utils.sheet_to_json(
        workbook.Sheets[Object.keys(workbook.Sheets)[0]], // todo: Possibly load all "Sheets" as separate data sources?
        { raw: false },
      );
      callback(json_data);
    };
    reader.readAsArrayBuffer(file);
  }

  function addDataNode(data, label, position) {
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

  async function addFileNode(entry, position) {
    const newEl = await createReactFlowNodeAsync({
      type: "FileSource",
      data: {
        entry,
        label: "foo",
      },
      position,
    });

    setElements((els) => [...els, newEl]);
  }

  const reactFlowWrapper = useRef(null);
  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const getUpdatedPoll = (entry, filePolls) => {
    return window.setInterval(async () => {
      const existingFile = filePollsRef.current.find(
        (x) => x.fileHandle === entry,
      );
      const latestRead = await entry.getFile();
      if (existingFile && latestRead.lastModified > existingFile.lastUpdated) {
        console.log("THERE WAS AN UPDATE!");
        clearInterval(existingFile.pollId);
        const newPoll = getUpdatedPoll(entry, filePollsRef.current);
        const update = filePollsRef.current.find((x) => x.fileHandle === entry);
        filePollsRef.current = [
          ...filePollsRef.current.filter((x) => x !== update),
          {
            ...update,
            pollId: newPoll,
            lastUpdated: latestRead.lastModified as number,
          } as FilePollInfo,
        ];
        // setFilePolls((prevFilePolls2) => {
        //   const newPoll = getUpdatedPoll(entry, prevFilePolls2);
        //   const update = prevFilePolls2.find((x) => x.fileHandle === entry);
        //   return [
        //     ...prevFilePolls2.filter((x) => x !== update),
        //     {
        //       ...update,
        //       pollId: newPoll,
        //       lastUpdated: latestRead.lastModified as number,
        //     } as FilePollInfo,
        //   ];
        // });
      } else {
        console.log("NO UPDATE");
      }
    }, 1000);
  };

  const onDrop = async (event) => {
    event.preventDefault();
    // @ts-ignore
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    // const type = event.dataTransfer.getData("application/reactflow");
    // @ts-ignore
    const position = reactflowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // Process all of the items.
    for (const item of event.dataTransfer.items) {
      // kind will be 'file' for file/directory entries.
      if (item.kind === "file") {
        const entry = await item.getAsFileSystemHandle();
        console.log("ENTRY", entry);
        if (entry.kind === "file") {
          // run code for if entry is a file
          // const file = await entry.getFile();
          // const newPoll = getUpdatedPoll(entry, filePollsRef.current);
          // filePollsRef.current = [
          //   ...filePollsRef.current,
          //   {
          //     fileHandle: entry,
          //     pollId: newPoll,
          //     lastUpdated: file.lastModified as number,
          //   } as FilePollInfo,
          // ];
          // setFilePolls((prevFilePolls) => {
          //   const newPoll = getUpdatedPoll(entry, prevFilePolls);
          //   return [
          //     ...prevFilePolls,
          //     {
          //       fileHandle: entry,
          //       pollId: newPoll,
          //       lastUpdated: file.lastModified as number,
          //     } as FilePollInfo,
          //   ];
          // });
          // parseFileData(file, (json_data) => {
          //   addDataNode(json_data, file.name, position);
          // });
          await addFileNode(entry, position);
        } else if (entry.kind === "directory") {
          // run code for is entry is a directory
        }
      }
    }
  };

  const NodeOmnibar = Omnibar.ofType();

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
        // onElementClick={onElementClick}
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
        // @ts-ignore
        snapGrid={snapGrid}
        defaultZoom={1}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeUpdate={onEdgeUpdate}
        onSelectionChange={(elements) => {
          // @ts-ignore
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
              // @ts-ignore
              onClick: () => reactflowInstance.fitView(),
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
          items={Object.entries(nodeTypes)}
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

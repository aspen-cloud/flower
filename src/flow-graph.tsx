import { nanoid } from "nanoid";
import React, { useState, useEffect, useCallback, useRef } from "react";
import XLSX from "xlsx";

import ReactFlow, {
  removeElements,
  addEdge,
  Controls,
  Background
} from "react-flow-renderer";
import * as AllNodes from "./graph-nodes/index";

import testData from "./test-data";
import { ItemPredicate, ItemRenderer, Omnibar } from "@blueprintjs/select";
import { HotkeysTarget2, MenuItem } from "@blueprintjs/core";

const onElementClick = (event, element) => {};

const initBgColor = "#343434";

const connectionLineStyle = { stroke: "#fff" };
const snapGrid = [20, 20];

function flattenNodes(nodes) {
  return Object.entries(nodes).flatMap(([key, val]) =>
    val.Component ? [[key, val]] : flattenNodes(val)
  );
}

const GraphNodes = Object.fromEntries(flattenNodes(AllNodes));

const nodeTypes = Object.fromEntries(
  Object.entries(GraphNodes).map(([key, val]) => [key, val.Component])
);

const columns = [
  {
    Header: "Address",
    accessor: "address"
  },
  {
    Header: "Price",
    accessor: "price"
  },
  {
    Header: "Size (SqrFt)",
    accessor: "sqrft"
  }
];

function createReactFlowNode({
  type,
  data,
  position
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
    style: { padding: "10px", border: "1px solid white", borderRadius: "10px" }
  };
}

const nodes = [
  createReactFlowNode({
    type: "DataSource",
    data: {
      rows: testData,
      columns
    },
    position: { x: 100, y: -200 }
  }),
  createReactFlowNode({
    type: "Table",
    position: { x: 100, y: -100 }
  }),
  createReactFlowNode({
    type: "ColumnGenerator",
    position: { x: 0, y: 0 }
  }),
  createReactFlowNode({
    type: "Table",
    position: { x: 0, y: 300 }
  }),
  createReactFlowNode({
    type: "AvgColumn",
    position: { x: 110, y: -150 }
  }),
  createReactFlowNode({
    type: "SingleCell",
    position: { x: 130, y: -130 }
  })
];

const FlowGraph = () => {
  const [reactflowInstance, setReactflowInstance] = useState(null);
  const [elements, setElements] = useState(nodes);
  const [bgColor, setBgColor] = useState(initBgColor);

  useEffect(() => {
    if (reactflowInstance && elements.length > 0) {
      //reactflowInstance.fitView();
    }
  }, [reactflowInstance, elements.length]);

  const onElementsRemove = useCallback(
    (elementsToRemove) =>
      setElements((els) => removeElements(elementsToRemove, els)),
    []
  );
  const onConnect = useCallback(
    (params) => {
      //console.log("on connect", params);
      const sourceNode = elements.find(({ id }) => id === params.source);
      const targetNode = elements.find(({ id }) => id === params.target);

      setElements((els) =>
        addEdge({ ...params, animated: true, style: { stroke: "#fff" } }, els)
      );

      const targetBus = targetNode!.data.sources[params.targetHandle];
      const sourceOutput = sourceNode!.data.sinks[params.sourceHandle];
      console.log(targetBus, sourceOutput);
      targetBus.plug(sourceOutput);
    },
    [elements]
  );

  const addNode = useCallback(({ type, position }) => {
    const newNode = createReactFlowNode({ type, position });
    setElements((prevElems) => prevElems.concat(newNode));
  }, []);

  const onLoad = useCallback(
    (rfi) => {
      if (!reactflowInstance) {
        setReactflowInstance(rfi);
        console.log("flow loaded:", rfi);
      }
    },
    [reactflowInstance]
  );

  function parseFileData(file, callback) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const json_data = XLSX.utils.sheet_to_json(
        workbook.Sheets[Object.keys(workbook.Sheets)[0]] // todo: Possibly load all "Sheets" as separate data sources?
      );
      callback(json_data);
    };
    reader.readAsArrayBuffer(file);
  }

  function addDataNode(data, position) {
    const cols = Object.keys(data.length ? data[0] : {}).map((col) => ({
      Header: col,
      accessor: col
    }));

    const newEl = createReactFlowNode({
      type: "DataSource",
      data: {
        rows: data,
        columns: cols
      },
      position
    });

    setElements((els) => [...els, newEl]);
  }

  const reactFlowWrapper = useRef(null);
  const onDragOver = (event) => {
    console.log(event);
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event) => {
    event.preventDefault();
    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    // const type = event.dataTransfer.getData("application/reactflow");
    const position = reactflowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top
    });
    const file = event.dataTransfer.files[0];
    parseFileData(file, (json_data) => {
      addDataNode(json_data, position);
    });
  };

  const NodeOmnibar = Omnibar.ofType();

  const [showNodeOmniBar, setShowNodeOmniBar] = useState(false);

  const renderNodeType: ItemRenderer<[string, any]> = (
    [key, component],
    { handleClick, modifiers, query }
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
    exactMatch
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
        panOnScrollMode="free"
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
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
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
            preventDefault: true
          }
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

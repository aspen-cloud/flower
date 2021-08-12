import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  DragEventHandler,
  useMemo,
} from "react";
import XLSX from "xlsx";

import ReactFlow, {
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
  EdgeProps,
} from "react-flow-renderer";

import { ItemRenderer } from "@blueprintjs/select";
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
  InputGroup,
  FormGroup,
  useHotkeys,
} from "@blueprintjs/core";

import { OmnibarItem } from "./types";
import { jsonToTable } from "./utils/tables";
import { csvToJson } from "./utils/files";
import { isWritableElement } from "./utils/elements";
import {
  addElementsToClipboard,
  ClipboardParseResult,
  ElementClipboardContext,
  parseClipboard,
} from "./utils/clipboard";
import type ProGraph from "./prograph";
import Spreadsheet from "./components/blueprint-spreadsheet";
import { Table } from "./types";

import DefaultEdge from "./graph-nodes/edges/default-edge";
import SuggestedEdge, {
  suggestedEdgeId,
} from "./graph-nodes/edges/suggested-edge";
import toaster from "./components/app-toaster";
import SelectGraphDialog from "./components/select-graph-dialog";
import { useHistory, useParams } from "react-router-dom";
import MouseNode from "./graph-nodes/utils/mouse-node";
import GraphOmnibar from "./graph-omnibar";
import DragPanZone from "./drag-pan-zone";
import useReactFlowElements from "./hooks/use-react-flow-elements";
import GraphNodes from "./graph-nodes";
import useDataManager from "./hooks/use-data-manager";

const initBgColor = "#343434";

const connectionLineStyle = { stroke: "#fff" };
const snapGrid: [number, number] = [20, 20];

const nodeTypes = Object.fromEntries(
  Object.entries(GraphNodes).map(([key, val]) => {
    const { Component } = val;
    return [key, Component];
  }),
);

nodeTypes.mouse = MouseNode;

const defaultOmnibarOptions = Object.keys(nodeTypes).map((t) => ({
  type: t,
  label: t,
  data: {},
}));

const ElementInfoMenuItem = ({ element }: { element: FlowElement }) => {
  const [isOpen, setIsOpen] = useState(false);
  const error = element.data?.inputs?.error || element.data?.outputs?.error;
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
          {error ? (
            <div>
              <b>Error:</b> {error.message}
            </div>
          ) : (
            ""
          )}
        </Card>
      </Collapse>
    </>
  );
};

// Use sparingly, main use case is to add unsupported interactions to nodes (ie resizing)
// May also be a good way to access react flow instance in the future if nodes need to be aware of graph state (ie zoom level)
export const GraphInternals = React.createContext<{
  proGraph: ProGraph;
  reactFlowInstance: OnLoadParams;
}>({
  proGraph: undefined,
  reactFlowInstance: undefined,
});

interface SpreadSheetTableData {
  initialData: Table;
  nodeId: string;
}

function addNode(prograph: ProGraph, { type, data, position }) {
  // @ts-ignore
  const { outputs, sources } = GraphNodes[type];
  const values =
    data ||
    Object.fromEntries(
      [
        ...(outputs ? Object.keys(outputs) : []),
        ...(sources ? Object.keys(sources) : []),
      ].map((key) => [
        key,
        null, // TODO use default value from Node definition
      ]),
    );
  return prograph.addNode({ type, position, sources: values });
}

interface OmnibarContext {
  type: string;
  metadata: any;
}

export default function FlowGraph({ prograph }: { prograph: ProGraph }) {
  const [reactflowInstance, setReactflowInstance] =
    useState<OnLoadParams | null>(null);

  const dataManager = useDataManager();

  const [mouseElements, setMouseElements] = useState<Elements>([]);
  const [suggestedEdges, setSuggestedEdges] = useState<Edge[]>([]);

  const [bgColor, setBgColor] = useState(initBgColor);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Elements>([]);
  const [omnibarQuery, setOmnibarQuery] = useState("");
  const [omnibarTags, setOmnibarTags] = useState<string[]>([]);
  const [nodeTypeList, setNodeTypeList] = useState<OmnibarItem[]>(
    defaultOmnibarOptions,
  );

  const graphElements = useReactFlowElements(prograph);
  const [graphName, setGraphName] = useState("");

  const [newGraphLoaded, setNewGraphLoaded] = useState(false);

  const [showSelectDialog, setShowSelectDialog] = useState(false);

  const { graphPath } = useParams<{ graphPath?: string }>();
  const history = useHistory();

  const graphId: string | null = useMemo(
    () => (graphPath ? graphPath.slice(-21) : null),
    [graphPath],
  );

  useEffect(() => {
    if (!newGraphLoaded || graphElements.length === 0 || !reactflowInstance)
      return;

    // zoom to previous state if available
    const canvasPosition = localStorage.getItem(`flowgraph-state-${graphId}`);
    if (canvasPosition) {
      reactflowInstance.setTransform(JSON.parse(canvasPosition));
    } else {
      reactflowInstance.fitView();
    }

    setNewGraphLoaded(false);
  }, [newGraphLoaded, graphElements, reactflowInstance]);

  useEffect(() => {
    setShowSelectDialog(false);
    setSideMenuOpen(true);

    toaster.show({
      intent: "success",
      message: `You are now viewing Graph ID:${graphId}`,
    });

    prograph.presence.setLocalState({
      name: "Anonymous",
      mousePosition: { x: 0, y: 0 },
    });
    prograph.presence.on("change", (changes) => {
      const collaboratorStates = Array.from(
        prograph.presence.getStates().entries(),
      ).filter(([key]) => key !== prograph.presence.clientID);
      const mouseElems: Elements = collaboratorStates
        .filter(
          ([_, state]) =>
            state.mousePosition &&
            state.mousePosition.x != null &&
            state.mousePosition.y != null,
        )
        .map(([key, state]) => ({
          position: state.mousePosition,
          id: `${key}-mouse`,
          type: "mouse",
          data: { label: state.name },
        }));

      setMouseElements(mouseElems);
    });
  }, [prograph]);

  useEffect(() => {
    if (!prograph) return;

    const subscription = prograph.name$.subscribe((name) => {
      setGraphName(name);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [prograph]);

  const [spreadsheetTableData, setSpreadsheetTableData] =
    useState<SpreadSheetTableData>();

  useEffect(() => {
    if (omnibarQuery) {
      const validNumber = !isNaN(Number(omnibarQuery));
      setNodeTypeList([
        ...(validNumber
          ? [
              {
                type: "Number",
                label: `Number: ${omnibarQuery}`,
                data: { number: Number(omnibarQuery) },
              },
            ]
          : []),
        ...defaultOmnibarOptions,
        {
          type: "Text",
          label: `Text: ${omnibarQuery}`,
          data: { text: omnibarQuery },
        },
      ]);
    } else {
      setNodeTypeList([...defaultOmnibarOptions]);
    }
  }, [omnibarQuery]);

  // TODO: not validating connections
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

    if (
      handleEdges.length >= 1 &&
      handleEdges.some((edge) => edge.type !== "suggested")
    ) {
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

  const onConnect = (connection: Connection | Edge<any>) => {
    prograph.addEdge({
      from: {
        nodeId: connection.source,
        busKey: connection.sourceHandle,
      },
      to: {
        nodeId: connection.target,
        busKey: connection.targetHandle,
      },
    });
  };

  const onElementsRemove = (elementsToRemove: Elements) => {
    for (const el of elementsToRemove) {
      if (isEdge(el)) {
        prograph.deleteEdge(el.id);
      } else {
        prograph.deleteNode(el.id);
        if (spreadsheetTableData?.nodeId === el.id)
          setSpreadsheetTableData(undefined);
      }
    }
  };

  const onEdgeUpdate: OnEdgeUpdateFunc<any> = (oldEdge, newConnection) => {
    // TODO fix to work with Prograph
    // setGraphElements((els) => {
    //   if (!validateConnection(newConnection, els)) return els;
    //   onEdgeDisconnect(oldEdge, els);
    //   onEdgeConnect(newConnection, els);
    //   return updateEdge(oldEdge, newConnection, els);
    // });
  };

  const onLoad: OnLoadFunc<any> = useCallback(
    (rfi) => {
      if (!reactflowInstance) {
        setReactflowInstance(rfi);
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

  async function addFileNode(
    entry: FileSystemFileHandle,
    label: string,
    position: XYPosition,
  ) {
    const file = await entry.getFile();
    const jsonData = await csvToJson(file);
    const tableData = jsonToTable(jsonData);
    addNode(prograph, {
      type: "DataTable",
      data: {
        table: tableData,
        label: file.name,
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
        if (entry.kind === "file") {
          // TODO: maybe add position offset if multiple
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
      .map((el) => prograph._nodes.get(el.id));
    const serializedEdges = els
      .filter((el) => isEdge(el))
      .map((el) => prograph._edges.get(el.id));
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
      addNode(prograph, {
        type: "Constant",
        data: {
          value: data,
        },
        position,
      });
    }

    if (type === "table") {
      const tableData = jsonToTable(data);
      addNode(prograph, {
        type: "DataTable",
        data: {
          table: tableData,
        },
        position,
      });
    }

    // TODO: less logic in flowgraph
    if (type === "nodes") {
      const clipboardElements = data as ElementClipboardContext[];
      // TODO: better typing here
      const clipboardNodes = clipboardElements.filter(
        (clipboardElement) => clipboardElement.element.position,
      );
      const clipboardEdges = clipboardElements.filter(
        (clipboardElement) => !clipboardElement.element.position,
      );

      const newNodes = clipboardNodes.map((clipboardNode) =>
        prograph.addNode({
          ...clipboardNode.element,
          position: {
            x: position.x + clipboardNode.xOffset,
            y: position.y + clipboardNode.yOffset,
          },
        }),
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
          prograph.addEdge({
            from: {
              nodeId: newNodesMap.get(edge.element.from.nodeId),
              busKey: edge.element.from.busKey,
            },
            to: {
              nodeId: newNodesMap.get(edge.element.to.nodeId),
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

  // Prevent document pinch zoom from firing (would happen on nowheel nodes), causes full page to zoom
  useEffect(() => {
    const wheelHandler = function (e) {
      // Ctrl key true if pinch zooming
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("wheel", wheelHandler, { passive: false });
    return () => {
      document.body.removeEventListener("wheel", wheelHandler);
    };
  }, []);

  // Would be nice to move omnibar stuff out of flowgraph
  const [showNodeOmniBar, setShowNodeOmniBar] = useState(false);
  const [nodeOmnibarContext, setNodeOmnibarContext] = useState<
    OmnibarContext | undefined
  >();

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

  function nodeInsertHandler(
    event,
    edgeId: string,
    nodeType: string,
    position: XYPosition,
  ) {
    if (!Object.keys(nodeTypes).includes(nodeType)) {
      console.log(nodeType, "IS NOT A NODE TYPE");
      return;
    }

    const {
      from: { nodeId: fromNodeId, busKey: fromBusKey },
      to: { nodeId: toNodeId, busKey: toBusKey },
    } = prograph.getEdge(edgeId);
    const newNodeId = addNode(prograph, {
      type: nodeType,
      data: {},
      position,
    });

    prograph.deleteEdge(edgeId);

    const suggestedEdges = prograph.getSuggestedEdges();
    const [firstPossibleIncomingEdge] = suggestedEdges.filter(
      (edge) =>
        edge.to.nodeId === newNodeId &&
        edge.from.nodeId === fromNodeId &&
        edge.from.busKey === fromBusKey,
    );
    const [firstPossibleOutgoingEdge] = suggestedEdges.filter(
      (edge) =>
        edge.to.nodeId === toNodeId &&
        edge.to.busKey === toBusKey &&
        edge.from.nodeId === newNodeId,
    );

    if (firstPossibleIncomingEdge) prograph.addEdge(firstPossibleIncomingEdge);
    if (firstPossibleOutgoingEdge) prograph.addEdge(firstPossibleOutgoingEdge);
  }

  const edgeTypes = {
    default: ({ ...props }: EdgeProps) => {
      // TODO: hot reload issue
      return DefaultEdge({
        ...props,
        nodeInsertHandler: nodeInsertHandler,
        addClickHandler: (edgeId: string, position: XYPosition) => {
          setNodeOmnibarContext({
            type: "insert",
            metadata: { edgeId, position },
          });
          const edge = prograph.getEdge(edgeId);
          // TODO: hard coded
          const inputType =
            GraphNodes[prograph.getNode(edge.from.nodeId).type].outputs[
              edge.from.busKey
            ].struct.type;
          const outputType =
            GraphNodes[prograph.getNode(edge.to.nodeId).type].inputs[
              edge.to.busKey
            ].type;
          setOmnibarTags([`input:${inputType}`, `output:${outputType}`]);
          setShowNodeOmniBar(true);
        },
      });
    },
    suggested: ({ ...props }: EdgeProps) => {
      return SuggestedEdge({
        ...props,
        onDoubleClick: (conn) => {
          prograph.addEdge(conn);
          setSuggestedEdges((prev) =>
            prev.filter((e) => e.id !== suggestedEdgeId(conn)),
          );
        },
      });
    },
  };

  const filterNodeTypes = (
    query: string,
    filters: string[],
    item: OmnibarItem,
    _index?: number,
    exactMatch?: boolean,
  ) => {
    if (!query || query.length === 0) return true;

    const normalizedTitle = item.label.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const normalizedFilters = Object.fromEntries(
      filters.map((filter) => filter.split(":")),
    );
    const itemType = GraphNodes[item.type];

    const queryFilter = exactMatch
      ? normalizedTitle === normalizedQuery
      : normalizedTitle.indexOf(normalizedQuery) >= 0;

    const inputFilter =
      !normalizedFilters.input ||
      Object.values(itemType?.inputs || {}).some(
        (struct) => struct.type === normalizedFilters.input,
      );

    const outputFilter =
      !normalizedFilters.output ||
      Object.values(itemType?.outputs || {}).some(
        (outputObj) => outputObj.struct.type === normalizedFilters.output,
      );

    return queryFilter && inputFilter && outputFilter;
  };

  const elements = useMemo(
    () => graphElements.concat(mouseElements).concat(suggestedEdges),
    [graphElements, mouseElements, suggestedEdges],
  );

  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (event) => {
      if (event.altKey) {
        // Using selected elements because multiselect is tied to onNode events
        const selectedNodes = selectedElements.filter((el) => isNode(el));
        const selectedEdges = selectedElements.filter((el) => isEdge(el));
        prograph.replaceElementGroup(
          selectedNodes.map((el) => el.id),
          selectedEdges.map((el) => el.id),
        );
      }
    },
    [selectedElements, prograph],
  );

  const [mode, setMode] = useState("GRAPH");
  const handleSuggestionIds = useRef<Record<string, Record<string, number>>>(
    {},
  );
  const nextHandleSuggestionId = useRef(1);
  const [edgeSuggestionInput, setEdgeSuggestionInput] = useState("");
  const edgeSuggestionInputRef = useRef(null);

  const getSuggestedEdgesForSelectedNodes = useCallback(() => {
    let selectedNodes = null;
    if (selectedElements.length) {
      selectedNodes = selectedElements.reduce<Node[]>((nodes, el) => {
        if (isNode(el)) nodes.push(el);
        return nodes;
      }, []);
    }

    let suggestedEdges = prograph.getSuggestedEdges();
    if (selectedNodes) {
      const nodeIds = new Set(selectedNodes.map((node) => node.id));
      suggestedEdges = suggestedEdges.filter(
        ({ from, to }) => nodeIds.has(from.nodeId) || nodeIds.has(to.nodeId),
      );
    }

    const suggestedConnections: Edge[] = suggestedEdges.map((conn, i) => {
      return {
        id: suggestedEdgeId(conn),
        source: conn.from.nodeId,
        sourceHandle: conn.from.busKey,
        target: conn.to.nodeId,
        targetHandle: conn.to.busKey,
        type: "suggested",
        data: {
          sourceHandleSuggestionId:
            handleSuggestionIds.current[conn.from.nodeId][conn.from.busKey],
          targetHandleSuggestionId:
            handleSuggestionIds.current[conn.to.nodeId][conn.to.busKey],
        },
      };
    });

    return suggestedConnections;
  }, [selectedElements, prograph]);

  // Handle the addition of new elements to the graph
  useEffect(() => {
    const nodeEls = graphElements.reduce<Node[]>((nodes, el) => {
      if (isNode(el)) nodes.push(el);
      return nodes;
    }, []);

    // On new node, set handle suggestion ids
    for (const node of nodeEls) {
      if (!(node.id in handleSuggestionIds.current)) {
        handleSuggestionIds.current[node.id] = {};
        for (const handle of Object.keys(GraphNodes[node.type].inputs)) {
          handleSuggestionIds.current[node.id][handle] =
            nextHandleSuggestionId.current;
          nextHandleSuggestionId.current += 1;
        }
        for (const handle of Object.keys(GraphNodes[node.type].outputs)) {
          handleSuggestionIds.current[node.id][handle] =
            nextHandleSuggestionId.current;
          nextHandleSuggestionId.current += 1;
        }
      }
    }

    // on new edge, this should remove the relevant suggested edges
    if (mode === "SUGGESTION") {
      setSuggestedEdges(getSuggestedEdgesForSelectedNodes());
    }
  }, [graphElements, getSuggestedEdgesForSelectedNodes, mode]);

  const enterSuggestionMode = useCallback(() => {
    setMode("SUGGESTION");
    edgeSuggestionInputRef.current?.focus();
    setSuggestedEdges(getSuggestedEdgesForSelectedNodes());
  }, [getSuggestedEdgesForSelectedNodes]);

  const exitSuggestionMode = useCallback(() => {
    setEdgeSuggestionInput("");
    setSuggestedEdges([]);
  }, []);

  const parseSuggestionInput = useCallback(
    (input: string): [Edge, string] => {
      const [handleA, handleB] = input.split("-");
      if (!handleA || !handleB)
        return [
          undefined,
          "Input must be of format <number>-<number> (eg. 6-18)",
        ];
      const idA = Number(handleA);
      const idB = Number(handleB);
      if (!Number.isInteger(idA) || idA < 1)
        return [undefined, `${handleA} is not a valid handle id`];
      if (!Number.isInteger(idB) || idB < 1)
        return [undefined, `${handleB} is not a valid handle id`];
      const suggestion = suggestedEdges.find(
        (edge) =>
          (edge.data.sourceHandleSuggestionId === idA &&
            edge.data.targetHandleSuggestionId === idB) ||
          (edge.data.sourceHandleSuggestionId === idB &&
            edge.data.targetHandleSuggestionId === idA),
      );
      if (!suggestion)
        return [
          undefined,
          `Based on your selection, no suggestion exists between ${handleA} and ${handleB}`,
        ];
      return [suggestion, undefined];
    },
    [suggestedEdges],
  );

  const onElementClick = useCallback(
    (event: React.MouseEvent, element: Node | Edge) => {
      if (isNode(element)) {
        if (mode === "GRAPH") {
          // TODO: Better modifier?
          if (event.altKey) {
            enterSuggestionMode();
          }
        }
      }
    },
    [enterSuggestionMode, mode],
  );

  // memoizing because we re-render on mouse moves
  const spreadsheetElement = useMemo(
    () =>
      spreadsheetTableData ? (
        <Spreadsheet
          initialData={spreadsheetTableData.initialData}
          onDataUpdate={async (columnData, rowData) => {
            const columns = columnData;
            const rows = rowData;
            prograph.updateNodeSources(spreadsheetTableData.nodeId, {
              table: {
                columns,
                rows,
              },
            });
          }}
        />
      ) : (
        "Must select a source node"
      ),
    [spreadsheetTableData, prograph],
  );

  const hotkeys = useMemo(() => {
    return [
      {
        combo: "esc",
        global: true,
        allowInInput: true, // Want to trigger on suggestion input
        disabled: mode === "GRAPH",
        label: "Escape non default mode",
        onKeyDown: () => {
          if (mode === "SUGGESTION") exitSuggestionMode();
          setMode("GRAPH");
        },
      },
      {
        combo: "S",
        global: true,
        disabled: mode !== "GRAPH",
        label: "Enter suggestion mode",
        onKeyDown: (e) => {
          e.preventDefault();
          enterSuggestionMode();
        },
      },
      {
        combo: "Enter",
        global: true,
        disabled: mode !== "SUGGESTION",
        label: "Focus suggestion input",
        onKeyDown: (e) => {
          e.preventDefault();
          edgeSuggestionInputRef.current.focus();
        },
      },
    ];
  }, [mode, enterSuggestionMode, exitSuggestionMode]);
  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        flex: 1,
        height: "100vh",
      }}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <SelectGraphDialog
        isOpen={showSelectDialog}
        onClose={() => {
          setShowSelectDialog(false);
        }}
        onNew={(graphId) => {
          history.push(`/${graphId}`);
        }}
      />
      <div
        ref={reactFlowWrapper}
        style={{
          flexGrow: 1,
        }}
      >
        {graphElements && ( // Don't load react flow until elements are ready
          <GraphInternals.Provider
            value={{ proGraph: prograph, reactFlowInstance: reactflowInstance }}
          >
            <ReactFlow
              elements={elements}
              panOnScroll={true}
              panOnScrollMode={PanOnScrollMode.Free}
              onMouseMove={(e) => {
                if (!reactflowInstance) return;
                const absolutePos = { x: e.clientX, y: e.clientY };
                const coordinates = reactflowInstance.project(absolutePos);
                prograph.presence.setLocalStateField(
                  "mousePosition",
                  coordinates,
                );
              }}
              onElementClick={onElementClick}
              onElementsRemove={onElementsRemove}
              onConnect={onConnect}
              style={{ background: bgColor }}
              onDoubleClick={() => {
                console.log("double clicked...");
              }}
              onLoad={onLoad}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionLineStyle={connectionLineStyle}
              snapToGrid={true}
              snapGrid={snapGrid}
              defaultZoom={1}
              onDrop={onDrop}
              onNodeDrag={(event) => {
                if (!isDragging) {
                  setIsDragging(true);
                  // Handling in onNodeDrag instead of onNodeDragStartso alt+click doesn't trigger the handler (only once we start dragging)
                  handleDragStart(event);
                }
              }}
              onNodeDoubleClick={(e, node) => {
                if (node.type === "DataTable") {
                  const nodeId = node.id;
                  const graphNode = prograph._nodes.get(nodeId);
                  setSpreadsheetTableData({
                    nodeId,
                    initialData: graphNode.sources.table as Table,
                  });
                  setBottomMenuOpen(true);
                } else {
                  setSpreadsheetTableData(undefined);
                }
              }}
              onSelectionDragStart={(event, _nodes) => handleDragStart(event)}
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
                ContextMenu.show(menu, {
                  left: event.clientX,
                  top: event.clientY,
                });
              }}
              onEdgeContextMenu={(event, edge) => {
                event.preventDefault();

                if (edge.type === "suggested") {
                  onConnect(edge);
                  return;
                }

                const menu = (
                  <Menu>
                    <MenuItem
                      onClick={() => onElementsRemove([edge])}
                      text="Delete edge"
                    />
                  </Menu>
                );
                ContextMenu.show(menu, {
                  left: event.clientX,
                  top: event.clientY,
                });
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
                ContextMenu.show(menu, {
                  left: event.clientX,
                  top: event.clientY,
                });
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
                ContextMenu.show(menu, {
                  left: event.clientX,
                  top: event.clientY,
                });
              }}
              edgeUpdaterRadius={20} // default is 10
              onMoveEnd={(flowTransform) =>
                localStorage.setItem(
                  `flowgraph-state-${graphId}`,
                  JSON.stringify(flowTransform),
                )
              }
              // TODO: watch API change to fix issue with drag stophttps://github.com/wbkd/react-flow/issues/1314
              onNodeDragStop={(e, node) => {
                setIsDragging(false);
                // Drag stop for individual node or multi node select
                // Bug with multi node select
                prograph.moveNode(node.id, node.position);
              }}
              onSelectionDragStop={(e, nodes) => {
                setIsDragging(false);

                // Drag stop for area selection
                for (const node of nodes) {
                  prograph.moveNode(node.id, node.position);
                }
              }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
              <Controls style={{ bottom: "unset", top: "10px" }} />
              {!sideMenuOpen ? (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "white",
                    borderRadius: "100%",
                    zIndex: 5,
                  }}
                  onClick={() => setSideMenuOpen(true)}
                >
                  <Icon icon="double-chevron-left" iconSize={20} />
                </div>
              ) : (
                ""
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  background: "white",
                  borderRadius: "100%",
                  zIndex: 5,
                }}
                onClick={() => setBottomMenuOpen((prev) => !prev)}
              >
                <Icon
                  icon={
                    bottomMenuOpen ? "double-chevron-down" : "double-chevron-up"
                  }
                  iconSize={20}
                />
              </div>

              <Drawer
                icon="multi-select"
                onClose={() => setSideMenuOpen(false)}
                title="General"
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
                    <FormGroup label="Name">
                      <InputGroup
                        value={graphName}
                        onChange={(e) => {
                          prograph.name = e.target.value;
                        }}
                      />
                    </FormGroup>
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
              <DragPanZone zoneId={"topLeft"} isDragging={isDragging} />
              <DragPanZone zoneId={"top"} isDragging={isDragging} />
              <DragPanZone zoneId={"topRight"} isDragging={isDragging} />
              <DragPanZone zoneId={"right"} isDragging={isDragging} />
              <DragPanZone zoneId={"bottomRight"} isDragging={isDragging} />
              <DragPanZone zoneId={"bottom"} isDragging={isDragging} />
              <DragPanZone zoneId={"bottomLeft"} isDragging={isDragging} />
              <DragPanZone zoneId={"left"} isDragging={isDragging} />
              {mode === "SUGGESTION" ? (
                <div
                  style={{
                    position: "absolute",
                    top: "20px",
                    left: "calc(50% - 200px)",
                    zIndex: 5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <InputGroup
                    value={edgeSuggestionInput}
                    onChange={(e) => {
                      setEdgeSuggestionInput(e.target.value);
                    }}
                    style={{ width: "400px" }}
                    inputRef={edgeSuggestionInputRef}
                    placeholder="Type an edge (eg. 4-10)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const [suggestion, errorMessage] =
                          parseSuggestionInput(edgeSuggestionInput);
                        if (suggestion) {
                          const conn = {
                            from: {
                              nodeId: suggestion.source,
                              busKey: suggestion.sourceHandle,
                            },
                            to: {
                              nodeId: suggestion.target,
                              busKey: suggestion.targetHandle,
                            },
                          };
                          prograph.addEdge(conn);
                          setEdgeSuggestionInput("");
                        } else {
                          toaster.show({
                            intent: "danger",
                            message: `Invalid: ${errorMessage}`,
                            className: "suggestion-mode-toast",
                          });
                        }
                      }
                    }}
                  />
                  <div style={{ color: "lightgray" }}>
                    Press 'enter' to add edge
                  </div>
                  <div style={{ color: "lightgray" }}>
                    Press 'escape' to exit Suggestion Mode
                  </div>
                </div>
              ) : (
                <></>
              )}
              <div
                style={{
                  background: "white",
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  padding: "2px",
                }}
              >
                Mode: {mode}
              </div>
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  border: `4px solid ${
                    mode === "SUGGESTION" ? "purple" : "transparent"
                  }`,
                }}
              ></div>
            </ReactFlow>
          </GraphInternals.Provider>
        )}
      </div>

      <HotkeysTarget2
        hotkeys={[
          {
            combo: "shift+o",
            global: true,
            label: "Open graph",
            allowInInput: false,
            onKeyDown: () => {
              setShowSelectDialog(true);
            },
          },
        ]}
      >
        <div></div>
      </HotkeysTarget2>

      <HotkeysTarget2
        hotkeys={[
          {
            combo: "n",
            global: true,
            label: "Show Omnibar",
            allowInInput: false,
            onKeyDown: () => {
              setShowNodeOmniBar(true);
            },
            preventDefault: true,
          },
        ]}
      >
        <GraphOmnibar
          noResults={<MenuItem disabled={true} text="No results." />}
          items={nodeTypeList}
          query={omnibarQuery}
          onQueryChange={(q, event) => {
            // TODO: why is event empty sometimes and not empty when setting tags?
            if (event) return;
            if (q.startsWith("[") && q.endsWith("]")) {
              const [tagKey, tagValue] = q.slice(1, q.length - 1).split(":");
              if (tagKey && tagValue && ["input", "output"].includes(tagKey)) {
                setOmnibarTags((prevTags) => [
                  ...prevTags,
                  `${tagKey}:${tagValue}`,
                ]);
              }
              setOmnibarQuery("");
            } else {
              setOmnibarQuery(q);
            }
          }}
          filters={omnibarTags}
          onFiltersChange={(filters) => setOmnibarTags(filters)}
          itemRenderer={renderNodeType}
          itemPredicateWithFilters={filterNodeTypes}
          onItemSelect={(item) => {
            const { type, data } = item;
            if (nodeOmnibarContext?.type === "insert") {
              nodeInsertHandler(
                null,
                nodeOmnibarContext?.metadata.edgeId,
                type,
                nodeOmnibarContext?.metadata.position,
              );
            } else {
              addNode(prograph, {
                type,
                data,
                position: getCanvasPosition(mousePosition.current),
              });
            }

            setShowNodeOmniBar(false);
            setNodeOmnibarContext(undefined);
            setOmnibarTags([]);
          }}
          onClose={() => {
            setShowNodeOmniBar(false);
            setNodeOmnibarContext(undefined);
            setOmnibarTags([]);
          }}
          isOpen={showNodeOmniBar}
          resetOnSelect={true}
        />
      </HotkeysTarget2>

      {bottomMenuOpen ? (
        <div style={{ height: "35%" }}>{spreadsheetElement}</div>
      ) : (
        ""
      )}
    </div>
  );
}

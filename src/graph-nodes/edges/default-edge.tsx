import { css, cx } from "@emotion/css";
import { Icon } from "@blueprintjs/core";
import { useState } from "react";
import {
  EdgeProps,
  getBezierPath,
  getEdgeCenter,
  getMarkerEnd,
  XYPosition,
} from "react-flow-renderer";

// No rhyme or reason here, just giving obj enough space
const foreignObjectDims = { width: 300, height: 20 };

interface MenuUnselectedProps {
  openMenuHandler: () => void;
}

function MenuUnselected({ openMenuHandler }: MenuUnselectedProps) {
  return (
    <div
      className="edge-menu-unselected"
      onClick={(e) => {
        openMenuHandler();
      }}
    >
      ...
    </div>
  );
}

interface MenuIndexProps {
  selectNodeInsertHandler: () => void;
  selectViewerHandler: (event) => void;
  closeMenuHandler: () => void;
}

function MenuIndex({
  selectNodeInsertHandler,
  selectViewerHandler,
  closeMenuHandler,
}: MenuIndexProps) {
  return (
    <div className="edge-menu-index">
      <div
        className="edge-menu-index-item"
        onClick={() => selectNodeInsertHandler()}
      >
        <Icon icon="plus" />
      </div>
      <div
        className="edge-menu-index-item"
        onClick={(e) => selectViewerHandler(e)}
      >
        <Icon icon="eye-open" />
      </div>
      <div
        className="edge-menu-index-item edge-menu-index-close"
        onClick={() => closeMenuHandler()}
      >
        <Icon icon="cross" />
      </div>
    </div>
  );
}

interface MenuNodeInsertProps {
  nodeInsertHandler: (event, nodeType: string) => void;
  closeMenuHandler: () => void;
}

function MenuNodeInsert({
  nodeInsertHandler,
  closeMenuHandler,
}: MenuNodeInsertProps) {
  const [nodeTypeInput, setNodeTypeInput] = useState("");

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#ddd",
      }}
    >
      <input
        style={{ flexGrow: 1 }}
        value={nodeTypeInput}
        onChange={(e) => setNodeTypeInput(e.target.value)}
      />
      <button
        onClick={(e) => {
          nodeInsertHandler(e, nodeTypeInput);
          setNodeTypeInput("");
          closeMenuHandler();
        }}
      >
        Enter
      </button>
      <button
        onClick={(e) => {
          setNodeTypeInput("");
          closeMenuHandler();
        }}
      >
        X
      </button>
    </div>
  );
}

interface DefaultEdgeProps extends EdgeProps {
  nodeInsertHandler: (
    event,
    edgeId: string,
    nodeType: string,
    position: XYPosition,
  ) => void;
  addClickHandler: (edgeId: string, position: XYPosition) => void;
}

const baseStyles = css`
  stroke: rgb(103 188 241);
  filter: drop-shadow(0px 0px 3px rgba(103, 188, 241, 0.9));
`;

const animatedStyles = css`
  animation: dashdraw 0.5s linear infinite;
  stroke-dasharray: 5;
`;

const errorStyles = css`
  @keyframes fadeIn {
    from {
      opacity: 0.3;
    }
  }
  animation: fadeIn 1s infinite alternate;
  stroke: red;
`;

export default function DefaultEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  arrowHeadType,
  markerEndId,
  nodeInsertHandler,
  addClickHandler,
}: DefaultEdgeProps) {
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
  const [edgeCenterX, edgeCenterY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const [menuView, setMenuView] = useState("unselected");

  const views = {
    unselected: <MenuUnselected openMenuHandler={() => setMenuView("index")} />,
    index: (
      <MenuIndex
        closeMenuHandler={() => setMenuView("unselected")}
        selectNodeInsertHandler={() =>
          addClickHandler(id, {
            x: edgeCenterX,
            y: edgeCenterY,
          })
        }
        selectViewerHandler={(e) =>
          nodeInsertHandler(e, id, "Viewer", {
            x: edgeCenterX,
            y: edgeCenterY,
          })
        }
      />
    ),
    nodeInsert: (
      <MenuNodeInsert
        nodeInsertHandler={(e, nodeTypeInput) =>
          nodeInsertHandler(e, id, nodeTypeInput, {
            x: edgeCenterX,
            y: edgeCenterY,
          })
        }
        closeMenuHandler={() => setMenuView("unselected")}
      />
    ),
  };

  const [showMenu, setShowMenu] = useState(false);

  return (
    <g
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => {
        setShowMenu(false);
        setMenuView("unselected");
      }}
    >
      {/* Adding transparent path here to increase selection width  - see also: https://github.com/wbkd/react-flow/issues/1114*/}
      <path
        style={{ strokeWidth: "30", stroke: "transparent" }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <path
        id={id}
        style={style}
        className={cx("react-flow__edge-path", baseStyles, animatedStyles, {
          [errorStyles]: data?.outputs?.error || data?.inputs?.error,
        })}
        d={edgePath}
        markerEnd={markerEnd}
      />
      <foreignObject
        width={foreignObjectDims.width}
        height={foreignObjectDims.height}
        x={edgeCenterX - foreignObjectDims.width / 2}
        y={edgeCenterY - foreignObjectDims.height / 2}
        className="edgebutton-foreignobject"
        requiredExtensions="http://www.w3.org/1999/xhtml"
        style={{ pointerEvents: "none" }}
      >
        {showMenu ? (
          <div
            style={{
              alignItems: "center",
              background: "transparent",
              display: "flex",
              height: `${foreignObjectDims.height}px`,
              justifyContent: "center",
              minHeight: `${foreignObjectDims.height}px`,
              width: `${foreignObjectDims.width}px`,
            }}
            className="edge-menu-container"
          >
            {views[menuView]}
          </div>
        ) : (
          <></>
        )}
      </foreignObject>
    </g>
  );
}

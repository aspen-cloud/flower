import { EdgeProps, getBezierPath, getMarkerEnd } from "react-flow-renderer";
import { GraphEdge } from "../../prograph";

interface DefaultEdgeProps extends EdgeProps {
  onDoubleClick: (conn: Omit<GraphEdge, "id">) => void;
}

const HOTKEY_LABEL_SIZE = 16;

export default function SuggestedEdge({
  id,
  source,
  sourceHandleId,
  target,
  targetHandleId,
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
  onDoubleClick,
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
  return (
    <>
      <path
        onDoubleClick={() =>
          onDoubleClick({
            from: {
              nodeId: source,
              busKey: sourceHandleId,
            },
            to: {
              nodeId: target,
              busKey: targetHandleId,
            },
          })
        }
        id={id}
        style={{
          stroke: "rgb(206 206 206 / 35%)",
          strokeWidth: "5px",
          ...style,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      {/* <foreignObject
        x={(data.incoming ? sourceX : targetX) - HOTKEY_LABEL_SIZE / 2}
        y={(data.incoming ? sourceY : targetY) - HOTKEY_LABEL_SIZE / 2}
        width={`${HOTKEY_LABEL_SIZE}px`}
        height={`${HOTKEY_LABEL_SIZE}px`}
      >
        <div
          style={{
            width: `${HOTKEY_LABEL_SIZE}px`,
            height: `${HOTKEY_LABEL_SIZE}px`,
            borderRadius: "50%",
            background: "lightgray",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
          }}
        >
          {data.index === 9 ? 0 : data.index + 1}
        </div>
      </foreignObject> */}
      {/* TODO: improve circle label (maybe something more akin to map pin) */}
      <g>
        <circle
          style={{
            fill: "lightgray",
          }}
          cx={sourceX}
          cy={sourceY + HOTKEY_LABEL_SIZE}
          r={HOTKEY_LABEL_SIZE}
        ></circle>
        <text
          x={sourceX}
          y={sourceY + HOTKEY_LABEL_SIZE}
          text-anchor="middle"
          dy=".3em"
        >
          {data.sourceHandleSuggestionId}
        </text>
        <circle
          style={{
            fill: "lightgray",
          }}
          cx={targetX}
          cy={targetY - HOTKEY_LABEL_SIZE}
          r={HOTKEY_LABEL_SIZE}
        ></circle>
        <text
          x={targetX}
          y={targetY - HOTKEY_LABEL_SIZE}
          text-anchor="middle"
          dy=".3em"
        >
          {data.targetHandleSuggestionId}
        </text>
      </g>
    </>
  );
}

export function suggestedEdgeId(conn: Omit<GraphEdge, "id">) {
  return JSON.stringify(conn);
}

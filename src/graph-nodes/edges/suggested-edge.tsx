import { EdgeProps, getBezierPath, getMarkerEnd } from "react-flow-renderer";
import { GraphEdge } from "../../prograph";

interface DefaultEdgeProps extends EdgeProps {
  onDoubleClick: (conn: Omit<GraphEdge, "id">) => void;
}

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
      <g id="UrTavla">
        <circle
          style={{
            fill: "lightgray",
            // stroke: "",
            strokeWidth: "1.6871",
            strokeMiterlimit: 10,
          }}
          cx={data.incoming ? sourceX : targetX}
          cy={data.incoming ? sourceY : targetY}
          r="15"
        ></circle>
        <text
          x={data.incoming ? sourceX : targetX}
          y={data.incoming ? sourceY : targetY}
          text-anchor="middle"
          // stroke="#51c5cf"
          stroke-width="2px"
          dy=".3em"
        >
          {data.index === 9 ? 0 : data.index + 1}
        </text>
      </g>
    </>
  );
}

export function suggestedEdgeId(conn: Omit<GraphEdge, "id">) {
  return JSON.stringify(conn);
}

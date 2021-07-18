import { getBezierPath, getMarkerEnd } from "react-flow-renderer";

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
}) {
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
      {/* Adding transparent path here to increase selection width  - see also: https://github.com/wbkd/react-flow/issues/1114*/}
      <path
        style={{ strokeWidth: "30", stroke: "transparent" }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        onClick={() => console.log("foo")}
      />
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
}

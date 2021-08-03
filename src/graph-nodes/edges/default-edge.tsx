import { css, cx } from "@emotion/css";
import { getBezierPath, getMarkerEnd } from "react-flow-renderer";

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
}) {
  // TODO: Need node output to inform if there is an output error
  // TODO: May need to determine if there is an input error
  // TODO: Display error information in sidebar?
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
      />
      <path
        id={id}
        style={style}
        className={cx("react-flow__edge-path", animatedStyles, {
          [errorStyles]: data?.outputs?.error || data?.inputs?.error,
        })}
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
}

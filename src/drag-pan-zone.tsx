import { useRef } from "react";
import { useStoreState } from "react-flow-renderer";

interface ZoneDefinition {
  box: {
    height: string;
    width: string;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  delta: {
    x: number;
    y: number;
  };
}

interface DragPanZoneProps {
  zoneId: string;
  isDragging: boolean;
}

const EDGE_DISTANCE = 60;
const PAN_DISTANCE = 10;
const PAN_DURATION = 16;

const zones: Record<string, ZoneDefinition> = {
  topLeft: {
    box: {
      height: `${EDGE_DISTANCE}px`,
      width: `${EDGE_DISTANCE}px`,
      top: "0px",
      left: "0px",
    },
    delta: {
      x: PAN_DISTANCE,
      y: PAN_DISTANCE,
    },
  },
  top: {
    box: {
      height: `${EDGE_DISTANCE}px`,
      width: `calc(100% - ${EDGE_DISTANCE * 2}px)`,
      top: "0px",
      left: `${EDGE_DISTANCE}px`,
    },
    delta: {
      x: 0,
      y: PAN_DISTANCE,
    },
  },
  topRight: {
    box: {
      height: `${EDGE_DISTANCE}px`,
      width: `${EDGE_DISTANCE}px`,
      top: "0px",
      right: "0px",
    },
    delta: {
      x: -PAN_DISTANCE,
      y: PAN_DISTANCE,
    },
  },
  right: {
    box: {
      height: `calc(100% - ${EDGE_DISTANCE * 2}px)`,
      width: `${EDGE_DISTANCE}px`,
      top: `${EDGE_DISTANCE}px`,
      right: "0px",
    },
    delta: {
      x: -PAN_DISTANCE,
      y: 0,
    },
  },
  bottomRight: {
    box: {
      height: `${EDGE_DISTANCE}px`,
      width: `${EDGE_DISTANCE}px`,
      bottom: "0px",
      right: "0px",
    },
    delta: {
      x: -PAN_DISTANCE,
      y: -PAN_DISTANCE,
    },
  },
  bottom: {
    box: {
      height: `${EDGE_DISTANCE}px`,
      width: `calc(100% - ${EDGE_DISTANCE * 2}px)`,
      bottom: "0px",
      left: `${EDGE_DISTANCE}px`,
    },
    delta: {
      x: 0,
      y: -PAN_DISTANCE,
    },
  },
  bottomLeft: {
    box: {
      height: `${EDGE_DISTANCE}px`,
      width: `${EDGE_DISTANCE}px`,
      bottom: "0px",
      left: "0px",
    },
    delta: {
      x: PAN_DISTANCE,
      y: -PAN_DISTANCE,
    },
  },
  left: {
    box: {
      height: `calc(100% - ${EDGE_DISTANCE * 2}px)`,
      width: `${EDGE_DISTANCE}px`,
      top: `${EDGE_DISTANCE}px`,
      left: "0px",
    },
    delta: {
      x: PAN_DISTANCE,
      y: 0,
    },
  },
};

// There's probably ways to make this smoother with fancier D3 logic to merge transitions or something
// Another implementation (couldnt get to work with react-dnd personally): https://github.com/wbkd/react-flow/issues/460
export default function DragPanZone({ zoneId, isDragging }: DragPanZoneProps) {
  const d3Zoom = useStoreState((store) => store.d3Zoom);
  const d3Selection = useStoreState((store) => store.d3Selection);
  const dragPanInterval = useRef(null);

  const zoneDefinition = zones[zoneId];

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 6, // should be above canvas buttons (5)
        pointerEvents: isDragging ? "all" : "none",
        ...zoneDefinition.box,
      }}
      onMouseEnter={(e) => {
        if (isDragging) {
          dragPanInterval.current = setInterval(() => {
            d3Selection
              .transition()
              .duration(PAN_DURATION)
              .call(
                d3Zoom.translateBy,
                zoneDefinition.delta.x,
                zoneDefinition.delta.y,
              );
          }, PAN_DURATION);
        }
      }}
      onMouseLeave={(e) => {
        clearInterval(dragPanInterval.current);
      }}
    ></div>
  );
}

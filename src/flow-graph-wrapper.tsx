import { Spinner } from "@blueprintjs/core";
import FlowGraph from "./flow-graph";
import useCurrentGraphId from "./hooks/use-current-graph-id";
import useGraph from "./hooks/use-graph";

export default function FlowGraphWrapper() {
  const currentGraphId = useCurrentGraphId();

  const prograph = useGraph(currentGraphId);

  if (!prograph) {
    return (
      <div>
        <Spinner intent="primary" size={200} />
      </div>
    );
  }
  return <FlowGraph prograph={prograph} />;
}

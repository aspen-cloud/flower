import { useEffect, useState } from "react";
import { Redirect, useParams } from "react-router-dom";
import { DataManager } from "../data-manager";
import useDataManager from "../hooks/use-data-manager";
import ProGraph from "../prograph";
import { kebabToTitleCase } from "../utils/names";

export default function DemoPage() {
  const { demoName } = useParams<{ demoName: string }>();
  const dataManager = useDataManager();
  const [loadedGraphId, setLoadedGraphId] = useState<string | null>(null);
  const [demoError, setDemoError] = useState(false);

  useEffect(() => {
    import(`../demos/${demoName}`)
      .then(
        async ({
          default: loadDemo,
        }: {
          default: (d: DataManager) => Promise<ProGraph>;
        }) => {
          const graph = await loadDemo(dataManager);
          setLoadedGraphId(graph.id);
        },
      )
      .catch((e) => {
        console.error(e);
        setDemoError(true);
      });
  }, [demoName]);

  if (demoError) {
    return (
      <div>Could not find demo with name {kebabToTitleCase(demoName)}</div>
    );
  }

  if (!loadedGraphId) {
    return <div>Loading demo...</div>;
  }

  return <Redirect to={`/${loadedGraphId}`} />;
}

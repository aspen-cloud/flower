import { Button, Card, Dialog, Divider, H4, Spinner } from "@blueprintjs/core";
import { css } from "@emotion/css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useCurrentGraphId from "../hooks/use-current-graph-id";
import useDataManager from "../hooks/use-data-manager";

export default function SelectGraphDialog({
  isOpen,
  onClose,
  onNew,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNew: (graphId: string) => void;
}) {
  const dataManager = useDataManager();
  const currentGraphId = useCurrentGraphId();
  const [allGraphs, setAllGraphs] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [currentGraph, setCurrentGraph] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sub = dataManager.graphs$.subscribe((graphObj) => {
      const graphList = Object.entries(graphObj);
      if (currentGraphId != null) {
        const currentGraphInfo = graphList.find(
          ([id]) => id === currentGraphId,
        );
        if (currentGraphInfo) {
          const [id, doc] = currentGraphInfo;
          setCurrentGraph({
            id,
            name: doc.getMap().get("name"),
          });
        }
      }
      setAllGraphs(
        graphList.map(([id, graph]) => {
          return {
            id,
            name: graph.getMap().get("name") || "",
          };
        }),
      );
    });
    return () => {
      sub.unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    dataManager.ready.then(() => setIsLoading(false));
  }, []);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Open a workspace">
      {currentGraph ? (
        <Card>
          <div>
            Currently viewing{" "}
            <b>
              {currentGraph.name} ({currentGraph.id})
            </b>
          </div>
        </Card>
      ) : null}
      <Card style={{ overflow: "scroll", maxHeight: "80vh" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <H4>Workspaces</H4>
          <Button
            onClick={async () => {
              const newGraph = await dataManager.newGraph();
              onNew(newGraph.id);
            }}
          >
            New
          </Button>
        </div>
        <Divider />
        {isLoading ? (
          <div>
            <Spinner />
          </div>
        ) : (
          <GraphList
            graphs={allGraphs.filter((graph) => graph.id !== currentGraphId)}
            onDelete={(id) => {
              dataManager.deleteGraph(id);
            }}
          />
        )}
      </Card>
    </Dialog>
  );
}

function GraphList({ graphs, onDelete }) {
  if (graphs.length === 0) {
    return <div>You don't have any workspaces yet.</div>;
  }
  return graphs.map(({ id, name }) => (
    <Link to={`/${name.split(" ").join("-")}-${id}`}>
      <Card
        style={{ marginBottom: "10px" }}
        title={name}
        elevation={1}
        interactive={true}
      >
        <div
          className={css`
            display: flex;
            justify-content: space-between;
            align-items: center;
          `}
        >
          <div>
            <H4>{name}</H4>
            <div>{id}</div>
          </div>
          {/* <div>{formatDistance(lastAccessed, new Date(), { addSuffix: true })}</div> */}
          <Button
            intent="danger"
            icon="delete"
            onClick={(e) => {
              e.preventDefault();
              onDelete(id);
            }}
          />
        </div>
      </Card>
    </Link>
  ));
}

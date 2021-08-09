import { Button, Card, Dialog, Divider, H3, H4 } from "@blueprintjs/core";
import { css } from "@emotion/css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DataManager from "../data-manager";

// TODO this should probably use a hook to get the datamanger and rely less on props

export default function SelectGraphDialog({
  isOpen,
  onClose,
  onNew,
  onDelete,
  dataManager,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNew: () => void;
  onDelete: (graphId: string) => void;
  dataManager: DataManager;
}) {
  const [allGraphs, setAllGraphs] = useState([]);
  useEffect(() => {
    dataManager.getAllGraphs().then((graphs) => {
      setAllGraphs(
        Object.entries(graphs).map(([id, graph]) => {
          return {
            id,
            name: graph.getMap().get("name") || "",
          };
        }),
      );
    });
  }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Open Previous Work">
      <Card style={{ overflow: "scroll", maxHeight: "80vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <H3>Select a graph</H3>
          <Button minimal onClick={onNew}>
            New
          </Button>
        </div>
        <Divider />
        {allGraphs.map(({ id, name }) => (
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
        ))}
      </Card>
    </Dialog>
  );
}

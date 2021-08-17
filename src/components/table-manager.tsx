import { useCallback, useContext, useEffect, useState } from "react";
import useDataManager from "../hooks/use-data-manager";
import * as Y from "yjs";
import { Column, RowValue } from "../types";
import { GraphInternals } from "../flow-graph";
import {
  Button,
  ButtonGroup,
  Classes,
  Dialog,
  Divider,
  InputGroup,
} from "@blueprintjs/core";

interface TableManagerObject {
  id: string;
  label: string;
  doc: Y.Doc;
}

interface TableEntryProps {
  table: TableManagerObject;
  onAdd: () => void;
  onUpdate: (updateFunc: (doc: Y.Doc) => void) => void;
  onDuplicate: () => Promise<void>;
  onDelete: (docId: string) => void;
}

function TableEntry({
  table,
  onAdd,
  onUpdate,
  onDuplicate,
  onDelete,
}: TableEntryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [entryInput, setEntryInput] = useState(table.label);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const updateLabel = useCallback(
    (value: string) => {
      onUpdate((doc) => doc.getMap("metadata").set("label", value));
    },
    [onUpdate],
  );

  function closeDeleteDialog() {
    setIsDeleteDialogOpen(false);
  }

  return (
    <div>
      {isEditing ? (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <InputGroup
            value={entryInput}
            onChange={(e) => setEntryInput(e.target.value)}
            fill={false}
          />
          <ButtonGroup>
            <Button
              onClick={() => {
                updateLabel(entryInput);
                setIsEditing(false);
              }}
              disabled={!entryInput}
              intent="primary"
            >
              Save
            </Button>
            <Button
              onClick={() => {
                setEntryInput(table.label);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </ButtonGroup>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "4px 0",
          }}
        >
          <span>
            {table.label}{" "}
            <Button
              onClick={() => setIsEditing(true)}
              icon="edit"
              minimal={true}
            />
          </span>
          <ButtonGroup>
            <Button onClick={() => onAdd()} icon="plus" />
            <Button
              onClick={async () => await onDuplicate()}
              icon="duplicate"
            />
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              icon="cross"
              intent="danger"
            />
          </ButtonGroup>
        </div>
      )}
      <Dialog
        icon="warning-sign"
        onClose={closeDeleteDialog}
        title="Are you sure?"
        isOpen={isDeleteDialogOpen}
      >
        <div className={Classes.DIALOG_BODY}>
          <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>
            Are you sure you would like to delete the data source{" "}
            <i>{table.label}</i>?
          </div>
          <div style={{ fontSize: "0.9em" }}>
            Deleting this data source will{" "}
            <b>also delete all nodes associated with this data source.</b>
          </div>
          <Divider />
          <Button
            intent="danger"
            onClick={() => {
              onDelete(table.id);
              closeDeleteDialog();
            }}
          >
            Yes, I understand
          </Button>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
        </div>
      </Dialog>
    </div>
  );
}

export default function TableManager() {
  const dataManager = useDataManager();
  // Had issue using graph hook since prograph instance was not the same (and thus in memory rx objects werent the same), so using provider here
  const { proGraph: graph, reactFlowInstance } = useContext(GraphInternals);
  const [tables, setTables] = useState<TableManagerObject[]>([]);

  useEffect(() => {
    // How can we get this to run on label change?
    const sub = dataManager.tables$.subscribe((tablesObj) => {
      setTables(
        Object.entries(tablesObj).map<TableManagerObject>(([id, table]) => {
          return {
            id,
            label: table.getMap("metadata").get("label") as string,
            doc: table,
          };
        }),
      );
    });
    return () => {
      sub.unsubscribe();
    };
  }, [dataManager.tables$]);

  return (
    <>
      <h4>Data Sources</h4>
      {tables?.length ? (
        tables.map((table) => (
          <TableEntry
            table={table}
            onAdd={() => {
              const docId = table.id;
              graph.addNode({
                type: "DataTable",
                position: reactFlowInstance.project({
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                }),
                sources: { docId },
              });
            }}
            onUpdate={(updateFunc) =>
              dataManager.updateTable(table.id, (doc) => updateFunc(doc))
            }
            onDuplicate={async () => {
              await dataManager.newTable(
                {
                  columns: table.doc.getArray<Column>("columns").toArray(),
                  rows: table.doc
                    .getArray<Record<string, RowValue>>("rows")
                    .toArray(),
                },
                `${table.label}(copy)`,
              );
            }}
            onDelete={(docId) => {
              const nodesToDelete = Array.from(graph.nodes.values())
                .filter(
                  (n) => n.type === "DataTable" && n.sources["docId"] === docId,
                )
                .map((n) => n.id);
              nodesToDelete.forEach((id) => graph.deleteNode(id));
              dataManager.deleteTable(docId);
            }}
          />
        ))
      ) : (
        <div>No data sources available.</div>
      )}
      <Button
        icon="add"
        intent="primary"
        onClick={() => {
          graph.addNode({
            type: "DataTable",
            position: reactFlowInstance.project({
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            }),
            sources: {
              docId: undefined,
            },
          });
        }}
        small={true}
      >
        New Data Source
      </Button>
    </>
  );
}

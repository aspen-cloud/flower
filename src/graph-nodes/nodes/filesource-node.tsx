import React, { useEffect, useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import BaseNode from "../../base-node";
import { GraphNode, Table } from "../../types";
import { BehaviorSubject } from "rxjs";
import { csvToJson } from "../../utils/files";
import { jsonToTable } from "../../utils/tables";

interface FileSourceNodeIO {
  sources: {
    label: BehaviorSubject<string>;
  };
  sinks: {
    output: BehaviorSubject<Table>;
  };
}

const FileSourceNode: GraphNode<FileSourceNodeIO> = {
  initializeStreams: function ({ initialData }): FileSourceNodeIO {
    console.log("initializing datasource with", initialData);
    const { data, entry } = initialData;
    let { lastRead } = initialData;
    const tableStream = new BehaviorSubject(data);
    const pollId = window.setInterval(async () => {
      const nextRead = await entry.getFile();
      if (lastRead.lastModified < nextRead.lastModified) {
        console.log("THERE WAS AN UPDATE");
        const nextJson = await csvToJson(nextRead);
        const nextTable = jsonToTable(nextJson);
        tableStream.next(nextTable);
        lastRead = nextRead;
      } else {
        console.log("NO UPDATE");
      }
    }, 1000);

    return {
      sources: {
        label: new BehaviorSubject(initialData.label),
      },
      sinks: {
        output: tableStream,
      },
    };
  },

  Component: function ({
    data: { sources, sinks },
  }: {
    data: FileSourceNodeIO;
  }) {
    const [label, setLabel] = useState("");
    useEffect(() => {
      const subscription = sources.label.subscribe(setLabel);
      return () => subscription.unsubscribe();
    }, []);
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <figure style={{ textAlign: "center" }}>
          <img
            style={{
              // @ts-ignore
              userDrag: "none",
              userSelect: "none",
              pointerEvents: "none",
            }}
            width="50px"
            src="/database.svg"
          />
          <figcaption style={{ backgroundColor: "#dedede", padding: "0 1em" }}>
            {label}
          </figcaption>
        </figure>
        <Handle position={Position.Bottom} type="source" />
      </BaseNode>
    );
  },
};

export default FileSourceNode;

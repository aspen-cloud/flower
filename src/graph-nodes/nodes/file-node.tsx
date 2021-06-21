import { constant, Property } from "kefir";
import React, { useEffect, useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import XLSX from "xlsx";
import BaseNode from "../../base-node";
import { GraphNode, Table } from "../../types";
import KefirBus from "../../utils/kefir-bus";

interface FileNodeIO {
  sources: {
    label: Property<string, void>;
  };
  sinks: {
    output: Property<Table<any>, void>;
  };
}

// const getUpdatedPoll = (entry, filePolls) => {
//   return window.setInterval(async () => {
//     const existingFile = filePollsRef.current.find(
//       (x) => x.fileHandle === entry,
//     );
//     const latestRead = await entry.getFile();
//     if (existingFile && latestRead.lastModified > existingFile.lastUpdated) {
//       console.log("THERE WAS AN UPDATE!");
//       clearInterval(existingFile.pollId);
//       const newPoll = getUpdatedPoll(entry, filePollsRef.current);
//       const update = filePollsRef.current.find((x) => x.fileHandle === entry);
//       filePollsRef.current = [
//         ...filePollsRef.current.filter((x) => x !== update),
//         {
//           ...update,
//           pollId: newPoll,
//           lastUpdated: latestRead.lastModified as number,
//         } as FilePollInfo,
//       ];
//       // setFilePolls((prevFilePolls2) => {
//       //   const newPoll = getUpdatedPoll(entry, prevFilePolls2);
//       //   const update = prevFilePolls2.find((x) => x.fileHandle === entry);
//       //   return [
//       //     ...prevFilePolls2.filter((x) => x !== update),
//       //     {
//       //       ...update,
//       //       pollId: newPoll,
//       //       lastUpdated: latestRead.lastModified as number,
//       //     } as FilePollInfo,
//       //   ];
//       // });
//     } else {
//       console.log("NO UPDATE");
//     }
//   }, 1000);
// };

async function parseFileData(file) {
  const data = await new Response(file).arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const json_data = XLSX.utils.sheet_to_json(
    workbook.Sheets[Object.keys(workbook.Sheets)[0]], // todo: Possibly load all "Sheets" as separate data sources?
    { raw: false },
  );
  console.log(json_data, data);
  // @ts-ignore
  const cols = Object.keys(json_data.length ? json_data[0] : {}).map((col) => ({
    Header: col,
    accessor: col,
  }));

  return {
    columns: cols,
    rows: json_data,
  };
}

// @ts-ignore
const FileSourceNode: GraphNode<FileNodeIO> = {
  initializeStreams: async function ({ initialData }): Promise<FileNodeIO> {
    console.log("initializing datasource with", initialData);
    const { entry } = initialData;
    const file = await entry.getFile();
    const tableStream = new KefirBus<Table<any>, void>("table");
    const tableData = await parseFileData(file);
    tableStream.emit(tableData);
    let lastRead = file;
    const pollId = window.setInterval(async () => {
      const nextRead = await entry.getFile();
      if (lastRead.lastModified < nextRead.lastModified) {
        console.log("THERE WAS AN UPDATE");
        const nextTable = await parseFileData(nextRead);
        tableStream.emit(nextTable);
        lastRead = nextRead;
      } else {
        console.log("NO UPDATE");
      }
    }, 1000);
    // parseFileData(file, callback)
    return {
      sources: {
        label: constant(initialData.label),
      },
      sinks: {
        output: tableStream.stream.toProperty(),
      },
    };
  },

  Component: function ({ data: { sources, sinks } }: { data: FileNodeIO }) {
    // const [label, setLabel] = useState("");
    // useEffect(() => {
    //   sources.label.observe((value) => {
    //     setLabel(value);
    //   });
    // }, []);
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
          {/* <figcaption style={{ backgroundColor: "#dedede", padding: "0 1em" }}>
            {label}
          </figcaption> */}
        </figure>
        <Handle position={Position.Bottom} type="source" />
      </BaseNode>
    );
  },
};

export default FileSourceNode;

import { array, object, string } from "superstruct";

const TableType = object({
  rows: array(object()),
  columns: object({ property: string(), name: string() })
});

/**
 * WIP
 */
// export const Map = {
//   label: "map",
//   inputs: {
//     table: {
//       type: TableType
//     },
//     newRow: {
//       type: object()
//     }
//   },
//   outputs: {
//     row: {
//       producer: (emitter, { table }) => {
//         for (const row of table.rows) {
//           emitter.emit(row);
//         }
//         emitter.end();
//       }
//     },
//     newTable: {
//       stream: ({ newRow, table }) => {
//         return Kefir.merge([newRow.bufferWhile(() => true), table]).map(
//           ([newRows, oldTable]) => ({
//             rows: newRows,
//             columns: oldTable.columns //TODO compute new columns
//           })
//         );
//       }
//     }
//   }
// };

export const First = {
  label: "First",
  inputs: {
    table: {
      type: TableType
    }
  },
  outputs: {
    row: ({ table }) => table.rows[0]
  }
};

export const Aggregate = {
  label: "Aggregate",
  description:
    "Aggregates the values for each column into simple lists of values.",
  inputs: {
    table: {
      type: TableType
    }
  },
  outputs: {
    columnVals({ table }) {
      return table.rows.reduce((acc, curr) => {
        for (const prop in curr) {
          if (acc[prop]) {
            acc[prop].push(curr[prop]);
          } else {
            acc[prop] = [curr[prop]];
          }
        }
        return acc;
      }, {});
    }
  }
};

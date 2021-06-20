import { array, object, string } from "superstruct";

const TableType = object({
  rows: array(object()),
  columns: object({ property: string(), name: string() })
});

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

interface ColumnParser {
  name: string;
  readParser: (value: string) => string;
  underlyingParser: (value: string) => any;
}

// TODO: should we combine logic to one function that outputs {read, underlying}?
const columnParsers: ColumnParser[] = [
  {
    name: "Text",
    readParser: (value) => value,
    underlyingParser: (value) => value,
  },
  {
    name: "Number",
    readParser: (value) => {
      if (!value) return "";

      const parsedNumber = Number(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }
      return parsedNumber.toString();
    },
    underlyingParser: (value) => {
      if (!value) return undefined;

      const parsedNumber = Number(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }
      return parsedNumber;
    },
  },
];

export default Object.fromEntries(
  columnParsers.map((type) => [type.name, type]),
);

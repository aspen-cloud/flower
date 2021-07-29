interface ParseResult {
  readValue: string;
  underlyingValue: any;
}

interface ColumnParser {
  name: string;
  parse: (value: string) => ParseResult;
}

// TODO: should we combine logic to one function that outputs {read, underlying}?
const columnParsers: ColumnParser[] = [
  {
    name: "Text",
    parse: (value) => ({
      readValue: value ?? "",
      underlyingValue: value,
    }),
  },
  {
    name: "Number",
    parse: (value) => {
      if (!value)
        return {
          readValue: "",
          underlyingValue: undefined,
        };

      const parsedNumber = Number(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }

      return {
        readValue: parsedNumber.toString(),
        underlyingValue: parsedNumber,
      };
    },
  },
  {
    name: "Percentage",
    parse: (value) => {
      if (!value)
        return {
          readValue: "",
          underlyingValue: undefined,
        };

      const parsedNumber = Number(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }

      return {
        readValue: `${parsedNumber * 100}%`,
        underlyingValue: parsedNumber,
      };
    },
  },
  {
    name: "Currency",
    parse: (value) => {
      if (!value)
        return {
          readValue: "",
          underlyingValue: undefined,
        };

      const parsedNumber = Number(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }

      return {
        readValue: `$${parsedNumber}`,
        underlyingValue: parsedNumber,
      };
    },
  },
];

export default Object.fromEntries(
  columnParsers.map((type) => [type.name, type]),
);

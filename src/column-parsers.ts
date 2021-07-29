interface ParseResult {
  readValue: string;
  writeValue: string;
  underlyingValue: any;
}

interface ColumnParser {
  name: string;
  parse: (value: string) => ParseResult;
}

const columnParsers: ColumnParser[] = [
  {
    name: "Text",
    parse: (value) => ({
      readValue: value ?? "",
      writeValue: value ?? "",
      underlyingValue: value,
    }),
  },
  {
    name: "Number",
    parse: (value) => {
      if (!value)
        return {
          readValue: "",
          writeValue: "",
          underlyingValue: undefined,
        };

      const parsedNumber = parseNumber(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }

      return {
        readValue: parsedNumber.toString(),
        writeValue: parsedNumber.toString(),
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
          writeValue: "",
          underlyingValue: undefined,
        };

      if (value[value.length - 1] === "%") {
        value = value.substring(0, value.length - 1);
        const parsedNumber = parseNumber(value);
        if (isNaN(parsedNumber)) {
          throw new Error(`"${value}" is not a valid number`);
        }

        return {
          readValue: `${parsedNumber}%`,
          writeValue: (parsedNumber / 100).toString(),
          underlyingValue: parsedNumber / 100,
        };
      } else {
        const parsedNumber = parseNumber(value);
        if (isNaN(parsedNumber)) {
          throw new Error(`"${value}" is not a valid number`);
        }

        return {
          readValue: `${parsedNumber * 100}%`,
          writeValue: parsedNumber.toString(),
          underlyingValue: parsedNumber,
        };
      }
    },
  },
  {
    name: "Currency",
    parse: (value) => {
      if (!value)
        return {
          readValue: "",
          writeValue: "",
          underlyingValue: undefined,
        };

      if (value[0] === "$") value = value.substring(1);

      const parsedNumber = parseNumber(value);
      if (isNaN(parsedNumber)) {
        throw new Error(`"${value}" is not a valid number`);
      }

      return {
        readValue: `$${parsedNumber}`,
        writeValue: parsedNumber.toString(),
        underlyingValue: parsedNumber,
      };
    },
  },
];

export default Object.fromEntries(
  columnParsers.map((type) => [type.name, type]),
);

export function parseNumber(value: string): number {
  if (value.match(/^-?(\d+|\d{1,3}(,\d{3})*)(\.\d+)?$/)) {
    return Number(value.replaceAll(",", ""));
  }
  return NaN;
}

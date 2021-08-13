import { IconName } from "@blueprintjs/core";

interface ParseResult {
  readValue: string; // How data is displayed statically
  writeValue: string; // How data is displayed in inputs
  underlyingValue: any; // How data is used under the hood
}

interface ColumnTypeDefinition {
  name: string;
  // Parsers take in a user value and output
  parse: (value: string) => ParseResult;
  icon: IconName;
}

const typeDefinitions: ColumnTypeDefinition[] = [
  {
    name: "Text",
    parse: (value) => ({
      readValue: value ?? "",
      writeValue: value ?? "",
      underlyingValue: value,
    }),
    icon: "font",
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
    icon: "numerical",
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
    icon: "percentage",
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
    icon: "dollar",
  },
];

function parseNumber(value: string): number {
  if (value.match(/^-?(\d+|\d{1,3}(,\d{3})*)?(\.\d+)?$/)) {
    return Number(value.replaceAll(",", ""));
  }
  return NaN;
}

const columnTypes: Record<string, ColumnTypeDefinition> = Object.fromEntries(
  typeDefinitions.map((type) => [type.name, type]),
);

export { columnTypes, parseNumber };

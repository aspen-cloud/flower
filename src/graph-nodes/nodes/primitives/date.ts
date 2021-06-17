import { date } from "superstruct";

// NOTE: date-fns eventually will be helpful here

export const GetDay = {
  label: "GetDay",
  inputs: {
    date: {
      type: date()
    }
  },
  outputs: {
    day: ({ date }) => date.getDate()
  }
};

export const GetMonth = {
  label: "GetMonth",
  inputs: {
    date: {
      type: date()
    }
  },
  outputs: {
    month: ({ date }) => date.getMonth() + 1
  }
};

export const GetYear = {
  label: "GetYear",
  inputs: {
    date: {
      type: date()
    }
  },
  outputs: {
    year: ({ date }) => date.getFullYear()
  }
};

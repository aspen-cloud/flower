// Todo: possibly use primitives

const filters = {
  "Is empty": (testVal = "", compareVal = "") =>
    !testVal && Number(testVal) !== 0,
  "Text contains": (testVal = "", compareVal = "") =>
    testVal.includes(compareVal),
  "Text starts with": (testVal = "", compareVal = "") =>
    testVal.startsWith(compareVal),
  "Text ends with": (testVal = "", compareVal = "") =>
    testVal.endsWith(compareVal),
  "Text is exactly": (testVal = "", compareVal = "") => testVal === compareVal,

  "Greater than": (testVal = "", compareVal = "") => +testVal > +compareVal,
  "Greater than or equal to": (testVal = "", compareVal = "") =>
    +testVal >= +compareVal,
  "Less than": (testVal = "", compareVal = "") => +testVal < +compareVal,
  "Less than or equal to": (testVal = "", compareVal = "") =>
    +testVal <= +compareVal,
  "Equal to": (testVal = "", compareVal = "") => +testVal === +compareVal,
};

export default filters;

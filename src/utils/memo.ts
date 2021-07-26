const parseDep = (args: any, dep: string) => {
  return dep.split(".").reduce((a, d) => (a ? a[d] : undefined), args);
};

// TODO: Superstruct create will mess with object compare
const flowMemo = (func: (...args: any[]) => any, deps: string[]) => {
  let prevArgs: Record<string, any> = {};
  let prevOutput: any;
  return ({ ...args }) => {
    if (deps.some((dep) => parseDep(args, dep) !== parseDep(prevArgs, dep))) {
      const result = func(args);
      prevOutput = result;
    }
    prevArgs = args;
    return prevOutput;
  };
};

export { flowMemo };

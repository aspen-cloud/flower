const flowMemo = (func: (...args: any[]) => any, deps: string[]) => {
  let prevArgs: Record<string, any> = {};
  let prevOutput: any;
  return ({ ...args }) => {
    if (deps.some((dep) => args[dep] !== prevArgs[dep])) {
      const result = func(args);
      prevOutput = result;
    }
    prevArgs = args;
    return prevOutput;
  };
};

export { flowMemo };

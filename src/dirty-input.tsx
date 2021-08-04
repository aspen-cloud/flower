import { InputGroup, InputGroupProps } from "@blueprintjs/core";
import { useState } from "react";

interface DirtyInputProps extends InputGroupProps {
  value: string;
  onConfirm: (value: string) => void;
}

// TODO: handle keystrokes (enter / esc), or use EditableText
const DirtyInput = ({ value, onConfirm, ...rest }: DirtyInputProps) => {
  const [dirtyValue, setDirtyValue] = useState(value);
  return (
    <InputGroup
      {...rest}
      value={dirtyValue}
      onChange={(e) => setDirtyValue(e.target.value)}
      onBlur={() => onConfirm(dirtyValue)}
    />
  );
};

export default DirtyInput;

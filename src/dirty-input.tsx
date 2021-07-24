import { InputGroup } from "@blueprintjs/core";
import { useState } from "react";

interface DirtyInputProps {
  value: string;
  onConfirm: (value: string) => void;
}

// TODO: handle keystrokes (enter / esc), or use EditableText
const DirtyInput = ({ value, onConfirm }: DirtyInputProps) => {
  const [dirtyValue, setDirtyValue] = useState(value);
  return (
    <InputGroup
      value={dirtyValue}
      onChange={(e) => setDirtyValue(e.target.value)}
      onBlur={() => onConfirm(dirtyValue)}
    />
  );
};

export default DirtyInput;

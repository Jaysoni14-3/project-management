import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "./Input";

const PasswordInput = React.forwardRef(({ label, id, ...props }, ref) => {
  const [show, setShow] = useState(false);

  return (
    <Input
      ref={ref}
      label={label}
      id={id}
      type={show ? "text" : "password"}
      trailingSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="text-fg-subtle hover:text-fg transition-colors duration-fast pointer-events-auto"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
});

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;

import React from "react";
import { Trash2 } from "lucide-react";
import IconButton from "./IconButton";

const DeleteButton = ({ onClick, ...rest }) => (
  <IconButton
    icon={Trash2}
    onClick={onClick}
    variant="destructive"
    size="sm"
    aria-label="Delete"
    {...rest}
  />
);

export default DeleteButton;

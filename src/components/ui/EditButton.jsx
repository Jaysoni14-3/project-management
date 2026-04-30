import React from "react";
import { Pencil } from "lucide-react";
import IconButton from "./IconButton";

const EditButton = ({ onClick, ...rest }) => (
  <IconButton
    icon={Pencil}
    onClick={onClick}
    variant="ghost"
    size="sm"
    aria-label="Edit"
    {...rest}
  />
);

export default EditButton;

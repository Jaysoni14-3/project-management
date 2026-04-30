import React from "react";

const Skeleton = ({ className = "", as: Tag = "div", ...rest }) => {
  return (
    <Tag
      aria-hidden
      className={`relative overflow-hidden bg-subtle rounded-sm
        before:absolute before:inset-0 before:bg-shimmer before:bg-[length:200%_100%]
        before:animate-shimmer
        ${className}`}
      {...rest}
    />
  );
};

export default Skeleton;

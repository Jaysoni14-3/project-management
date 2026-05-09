import React from "react";
import Select from "react-select";
import selectStyles from "./selectStyles";

/* Project-wide react-select wrapper.

   Why this exists: every place we use react-select sits inside a Modal
   that has `overflow-hidden` on the sheet to keep it from overflowing
   its rounded corners. That clipping also clips the dropdown menu, so
   long option lists get cut off and become impossible to scroll. The
   fix is to portal the menu to <body> and switch it to fixed
   positioning so it renders outside the modal's overflow boundary.

   Anything passed as a prop overrides the defaults below. Callers
   wanting a custom `styles` object should merge with `selectStyles`
   themselves; default behaviour is to use the shared styles. */
const AppSelect = React.forwardRef((props, ref) => (
  <Select
    ref={ref}
    styles={selectStyles}
    classNamePrefix="react-select"
    menuPortalTarget={
      typeof document !== "undefined" ? document.body : undefined
    }
    menuPosition="fixed"
    menuShouldBlockScroll
    {...props}
  />
));

AppSelect.displayName = "AppSelect";

export default AppSelect;

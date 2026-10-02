import { Link } from "react-router-dom";
import "./Button.css";

function classes(variant, fullWidth, className) {
  return [
    "button",
    `button--${variant}`,
    fullWidth ? "button--full" : "",
    className || "",
  ].filter(Boolean).join(" ");
}

export function Button({ variant = "primary", fullWidth = false, className, children, ...props }) {
  return (
    <button className={classes(variant, fullWidth, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ to, variant = "primary", fullWidth = false, className, children, ...props }) {
  return (
    <Link to={to} className={classes(variant, fullWidth, className)} {...props}>
      {children}
    </Link>
  );
}

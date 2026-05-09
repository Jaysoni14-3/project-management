import React from "react";

import logger from "../../lib/logger";
import FullPageError from "./FullPageError";

/* React error boundaries catch runtime errors thrown during render
   in their subtree. Without one, a single unguarded `null.foo` access
   anywhere in the app blanks the whole screen.

   Strategy:
     - Top-level boundary (whole app) — last-resort, full-page fallback
     - Route-level boundary (per page) — keeps the chrome rendered
     - Component-level boundary — for risky widgets

   `scope` is a logging tag like "Chat" or "ProjectsPage" so the log
   line tells us which boundary caught the error.

   `fallback` lets callers render a custom UI instead of FullPageError.
   The default is the design-system FullPageError. */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logger.error(`ErrorBoundary:${this.props.scope || "unknown"}`, error, {
      componentStack: info?.componentStack,
    });
  }

  /* Reset on prop change is sometimes needed when the route changes
     under us — otherwise the user is stuck on the error UI even after
     navigating away. The simplest signal is the `resetKey` prop the
     consumer can flip (we use the route pathname downstream). */
  componentDidUpdate(prevProps) {
    if (
      this.state.error &&
      this.props.resetKey !== undefined &&
      this.props.resetKey !== prevProps.resetKey
    ) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback({ error, reset: this.reset });
    }
    if (this.props.fallback) return this.props.fallback;

    return (
      <FullPageError
        error={error}
        title="Something broke on this page"
        description="We've logged the error so we can fix it. Try again, or head back to the dashboard."
        onRetry={this.reset}
      />
    );
  }
}

export default ErrorBoundary;

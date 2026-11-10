import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import "./errorBoundary.css";

/**
 * ErrorBoundary — containment for unexpected render errors.
 *
 * Why this exists: before this boundary a crash inside a single Settings
 * panel (or any lazily-loaded route) unmounted the ENTIRE React tree and
 * left a white page with no way back. This boundary catches the error at
 * the nearest section edge and keeps everything around it alive.
 *
 * Not a substitute for fixing root causes (see git history) — it is the
 * last-resort UI so users always get an understandable message + Retry.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Real diagnostics — never suppressed, always reported.
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const { labelKey } = this.props;
      return (
        <div role="alert" className="error-boundary">
          <p className="error-boundary__msg">{labelKey ? this.props.t(labelKey) : this.props.t("error.generic")}</p>
          <button type="button" onClick={this.handleRetry}>
            {this.props.t("common.retry")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

/** Public API — function wrapper supplies translations to the class. */
const ErrorBoundaryContainer = ({ labelKey, children }) => {
  const { t } = useTranslation();
  return <ErrorBoundary labelKey={labelKey} t={t}>{children}</ErrorBoundary>;
};

export default ErrorBoundaryContainer;

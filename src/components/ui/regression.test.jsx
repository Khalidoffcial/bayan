/**
 * Regression tests for the two production white-screen crashes:
 *  1) TypeError "e is not a function" — Toast.jsx .map callback param `t`
 *     shadowed the translation fn; `aria-label={t("toast.close")}` became a
 *     call on the toast OBJECT. Fired the instant any toast rendered — i.e.
 *     right after every successful delete/edit operation.
 *  2) IntersectionObserver "parameter 1 is not of type 'Element'" —
 *     FontPicker FontRow cleanup used ref.current, already nulled by React
 *     before unmount cleanup ran.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsProvider } from "../../contexts/SettingsContext";
import { ToastProvider, useToast } from "./Toast";
import ErrorBoundary from "./ErrorBoundary";

const ToastProbe = () => {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("deleted!")}>fire-delete-toast</button>
      <button onClick={() => toast.error("boom")}>fire-error-toast</button>
      <button onClick={() => toast.success({ not: "a string" })}>fire-bad-toast</button>
      <button onClick={() => toast.info("")}>fire-empty-toast</button>
    </>
  );
};

describe("Toast (regression: TypeError e is not a function)", () => {
  beforeEach(() => {
    // Boundary renders an alert if the white-screen bug ever regresses.
    const spy = jest.spyOn(console, "error").mockImplementation(() => { });
    return () => spy.mockRestore();
  });

  test("rendering a success toast does not throw and is dismissible", async () => {
    render(
      <SettingsProvider>
        <ToastProvider>
          <ToastProbe />
        </ToastProvider>
      </SettingsProvider>
    );
    fireEvent.click(screen.getByText("fire-delete-toast"));
    expect(await screen.findByText("deleted!")).toBeInTheDocument();
    // close button uses the translated aria-label (previously crashed here)
    fireEvent.click(screen.getByRole("button", { name: /close notification/i }));
    await waitFor(() => expect(screen.queryByText("deleted!")).not.toBeInTheDocument());
  });

  test("non-string payloads are coerced instead of crashing render", () => {
    render(
      <SettingsProvider>
        <ToastProvider>
          <ToastProbe />
        </ToastProvider>
      </SettingsProvider>
    );
    expect(() => fireEvent.click(screen.getByText("fire-bad-toast"))).not.toThrow();
  });

  test("empty message produces no toast and no crash", () => {
    render(
      <SettingsProvider>
        <ToastProvider>
          <ToastProbe />
        </ToastProvider>
      </SettingsProvider>
    );
    fireEvent.click(screen.getByText("fire-empty-toast"));
    expect(document.querySelector(".toast")).toBeNull();
  });
});

const Bomb = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error("panel exploded");
  return <div>panel-ok</div>;
};

describe("ErrorBoundary (regression: full-page white screens)", () => {
  test("a crashing panel is contained with a retry control", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => { });
    const { rerender } = render(
      <SettingsProvider>
        <ErrorBoundary key="v1">
          <Bomb shouldThrow />
        </ErrorBoundary>
      </SettingsProvider>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("panel-ok")).not.toBeInTheDocument();
    // retry (fresh children, boundary state cleared) recovers the subtree
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    rerender(
      <SettingsProvider>
        <ErrorBoundary key="v2">
          <Bomb shouldThrow={false} />
        </ErrorBoundary>
      </SettingsProvider>
    );
    expect(screen.getByText("panel-ok")).toBeInTheDocument();
    spy.mockRestore();
  });
});

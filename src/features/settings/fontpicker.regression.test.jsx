/**
 * Regression: FontPicker FontRow unobserve during rapid unmount.
 * Production stack: 801.57a60bff.chunk.js "unobserve ... not of type 'Element'"
 * Triggered by rapid Settings tab switching (FontRow unmounts while the
 * shared observer was recreated mid-flight).
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SettingsProvider } from "../../contexts/SettingsContext";
import { AppearanceSettings } from "./index";

const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

class MockIntersectionObserver {
  constructor(cb) { this.cb = cb; }
  observe(el) {
    if (!(el instanceof Element)) {
      throw new TypeError("parameter 1 is not of type 'Element'");
    }
    mockObserve(el);
  }
  unobserve(el) {
    if (!(el instanceof Element)) {
      // Exactly the production crash — any regression re-throws here.
      throw new TypeError("parameter 1 is not of type 'Element'");
    }
    mockUnobserve(el);
  }
  disconnect() { mockDisconnect(); }
}

describe("FontPicker IntersectionObserver lifecycle (regression)", () => {
  beforeEach(() => {
    mockObserve.mockClear(); mockUnobserve.mockClear(); mockDisconnect.mockClear();
    window.IntersectionObserver = MockIntersectionObserver;
  });

  test("rapid mount/unmount of the Appearance tab never passes a non-Element to unobserve", () => {
    for (let i = 0; i < 5; i++) {
      const { unmount } = render(
        <SettingsProvider>
          <AppearanceSettings />
        </SettingsProvider>
      );
      // rows observed (only for real elements) — jsdom reports zero-size
      // elements as never-intersecting, so a call count is asserted loosely
      expect(mockObserve.mock.calls.every(([el]) => el instanceof Element)).toBe(true);
      // unmount = the exact production crash point (cleanup after ref null-out)
      expect(() => unmount()).not.toThrow(TypeError);
      expect(mockUnobserve.mock.calls.every(([el]) => el instanceof Element)).toBe(true);
    }
  });

  test("search filtering remounts rows safely (query → fewer rows → unmount)", () => {
    const { unmount } = render(
      <SettingsProvider>
        <AppearanceSettings />
      </SettingsProvider>
    );
    const input = screen.getByPlaceholderText(/search/i);
    act(() => { fireEvent.change(input, { target: { value: "zzz-no-match" } }); });
    expect(() => unmount()).not.toThrow(TypeError);
  });
});

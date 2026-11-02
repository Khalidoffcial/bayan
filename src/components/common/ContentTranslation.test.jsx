/**
 * ContentTranslation tests — original text is never replaced,
 * translation appears only below, and only on request.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsProvider } from "../../contexts/SettingsContext";
import ContentTranslation from "./ContentTranslation";
import { translateContent } from "../../services/translation.service";

jest.mock("../../services/translation.service");

describe("ContentTranslation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows 'Translate to English' trigger in English UI (LTR)", () => {
    render(
      <SettingsProvider>
        <ContentTranslation
          contentId="p1"
          contentType="posts"
          content="مرحبا بالعالم"
        />
      </SettingsProvider>
    );
    expect(screen.getByText(/translate to english/i)).toBeInTheDocument();
    // No auto translation — result not shown
    expect(screen.queryByText(/machine translation/i)).not.toBeInTheDocument();
  });

  test("renders nothing without contentId or content", () => {
    const { container } = render(
      <SettingsProvider>
        <ContentTranslation contentId="p1" contentType="posts" content="" />
      </SettingsProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("clicking translate calls the service and shows translation BELOW the original", async () => {
    translateContent.mockResolvedValue({
      ok: true,
      translatedText: "Hello world",
      sourceLang: "ar",
      cached: false,
    });

    render(
      <SettingsProvider>
        <ContentTranslation
          contentId="p1"
          contentType="posts"
          content="مرحبا بالعالم"
        />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByText(/translate to english/i));

    await waitFor(() => {
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    // Original text is still visible above the translation — never replaced
    const trigger = screen.queryByText(/translate to english/i);
    expect(trigger).not.toBeInTheDocument();
    expect(screen.getByText(/show original/i)).toBeInTheDocument();
    expect(screen.getByText(/hide translation/i)).toBeInTheDocument();
    expect(screen.getByText(/machine translation/i)).toBeInTheDocument();
    expect(translateContent).toHaveBeenCalledWith({
      contentId: "p1",
      contentType: "posts",
      targetLang: "en",
      text: "مرحبا بالعالم",
    });
  });

  test("show original / show translation toggles preserve the translated state", async () => {
    translateContent.mockResolvedValue({
      ok: true,
      translatedText: "Hello world",
      sourceLang: "ar",
    });

    render(
      <SettingsProvider>
        <ContentTranslation
          contentId="p1"
          contentType="posts"
          content="مرحبا بالعالم"
        />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByText(/translate to english/i));
    await waitFor(() => expect(screen.getByText("Hello world")).toBeInTheDocument());

    // Show original → hides translation but keeps state
    fireEvent.click(screen.getByText(/show original/i));
    expect(screen.queryByText("Hello world")).not.toBeInTheDocument();
    expect(screen.getByText(/show translation/i)).toBeInTheDocument();

    // Show translation again — no new API call
    const callsBefore = translateContent.mock.calls.length;
    fireEvent.click(screen.getByText(/show translation/i));
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(translateContent.mock.calls.length).toBe(callsBefore);
  });

  test("hide translation returns to the idle state", async () => {
    translateContent.mockResolvedValue({ ok: true, translatedText: "Hello", sourceLang: "ar" });

    render(
      <SettingsProvider>
        <ContentTranslation contentId="p1" contentType="posts" content="نص عربي" />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByText(/translate to english/i));
    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument());

    fireEvent.click(screen.getByText(/hide translation/i));
    expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    expect(screen.getByText(/translate to english/i)).toBeInTheDocument();
  });

  test("shows failure state with retry when the service fails", async () => {
    translateContent
      .mockResolvedValueOnce({ ok: false, error: "PROVIDER_FAILED", message: "upstream down" })
      .mockResolvedValueOnce({ ok: true, translatedText: "Fixed", sourceLang: "ar" });

    render(
      <SettingsProvider>
        <ContentTranslation contentId="p1" contentType="posts" content="نص عربي" />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByText(/translate to english/i));
    await waitFor(() => expect(screen.getByText(/translation service error/i)).toBeInTheDocument());
    expect(screen.getByText(/retry/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/retry/i));
    await waitFor(() => expect(screen.getByText("Fixed")).toBeInTheDocument());
  });
});

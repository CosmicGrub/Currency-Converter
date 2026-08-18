import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import CurrencyQuiz from "./CurrencyQuiz.js";

describe("CurrencyQuiz", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("asks a question with 4 distinct answer options", () => {
    render(<CurrencyQuiz />);
    expect(screen.getByText(/which currency uses the code/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").filter((b) => b.textContent !== "Next →");
    expect(buttons).toHaveLength(4);
  });

  it("reveals correctness and shows Next after answering, and persists stats", () => {
    render(<CurrencyQuiz />);
    const buttons = screen.getAllByRole("button").filter((b) => b.textContent !== "Next →");
    fireEvent.click(buttons[0]);

    // Further option clicks are now disabled (one answer per question).
    buttons.forEach((b) => expect(b).toBeDisabled());
    expect(screen.getByText("Next →")).toBeInTheDocument();

    // Stats got persisted to localStorage under the namespaced key.
    const raw = localStorage.getItem("exchangeboard:quizStats");
    expect(raw).not.toBeNull();
    const stats = JSON.parse(raw as string);
    const [code] = Object.keys(stats);
    expect(stats[code].correct + stats[code].incorrect).toBe(1);
  });

  it("loads the next question and re-enables answering", () => {
    render(<CurrencyQuiz />);
    const firstOptions = screen.getAllByRole("button").filter((b) => b.textContent !== "Next →");
    fireEvent.click(firstOptions[0]);
    fireEvent.click(screen.getByText("Next →"));

    const nextOptions = screen.getAllByRole("button").filter((b) => b.textContent !== "Next →");
    expect(nextOptions).toHaveLength(4);
    nextOptions.forEach((b) => expect(b).not.toBeDisabled());
  });
});

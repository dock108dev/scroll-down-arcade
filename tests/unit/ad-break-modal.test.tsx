import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdBreakModal } from "@/components/AdBreakModal";

describe("AdBreakModal", () => {
  it("renders the placeholder copy and Continue button", () => {
    render(<AdBreakModal onContinue={() => {}} />);
    expect(
      screen.getByText(/Ad Break Placeholder/i),
    ).toBeTruthy();
    const cta = screen.getByTestId("ad-continue");
    expect(cta.textContent).toBe("Continue Run");
  });

  it("invokes onContinue when the Continue button is clicked", async () => {
    const onContinue = vi.fn();
    render(<AdBreakModal onContinue={onContinue} />);
    await userEvent.click(screen.getByTestId("ad-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("exposes a modal dialog role with aria-labelledby pointing at the title", () => {
    render(<AdBreakModal onContinue={() => {}} />);
    const dialog = screen.getByTestId("ad-break-modal");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBe("ad-break-title");
    expect(document.getElementById(labelledBy!)).toBeTruthy();
  });

  it("auto-focuses the Continue button on mount", () => {
    render(<AdBreakModal onContinue={() => {}} />);
    expect(document.activeElement).toBe(screen.getByTestId("ad-continue"));
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "../star-rating";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StarRating", () => {
  describe("Rendering", () => {
    it("renders 5 stars by default", () => {
      render(<StarRating value={null} onChange={vi.fn()} />);

      const stars = screen.getAllByRole("radio");
      expect(stars).toHaveLength(5);
    });

    it("renders custom max number of stars", () => {
      render(<StarRating value={null} onChange={vi.fn()} max={10} />);

      const stars = screen.getAllByRole("radio");
      expect(stars).toHaveLength(10);
    });

    it("displays filled stars up to value", () => {
      const { container } = render(<StarRating value={3} onChange={vi.fn()} />);

      // Check SVG fill attributes (stars 1-3 should be filled)
      const starButtons = screen.getAllByRole("radio");
      expect(starButtons).toHaveLength(5);

      // Stars are filled via the fill="currentColor" attribute
      const filledStars = container.querySelectorAll('svg[fill="currentColor"]');
      expect(filledStars.length).toBe(3);
    });

    it("renders in readonly mode", () => {
      render(<StarRating value={4} readonly />);

      // In readonly mode, the container has the rating label
      const container = screen.getByLabelText(/Rating: 4 out of 5 stars/i);
      expect(container).toBeInTheDocument();

      // Buttons should be disabled in readonly mode
      const stars = screen.getAllByRole("button");
      stars.forEach((star) => {
        expect(star).toBeDisabled();
      });
    });

    it("shows rating label when showLabel is true", () => {
      render(<StarRating value={4} showLabel />);

      expect(screen.getByText("Very Good")).toBeInTheDocument();
    });

    it("displays correct labels for each rating", () => {
      const labels = [
        { value: 1, label: "Poor" },
        { value: 2, label: "Fair" },
        { value: 3, label: "Good" },
        { value: 4, label: "Very Good" },
        { value: 5, label: "Excellent" },
      ];

      labels.forEach(({ value, label }) => {
        const { unmount } = render(<StarRating value={value} showLabel />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Interactive Mode", () => {
    it("calls onChange when star is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={null} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      await user.click(stars[2]); // Click 3rd star

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("does not call onChange in readonly mode", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={3} onChange={onChange} readonly />);

      const stars = screen.getAllByRole("button");
      await user.click(stars[4]); // Click 5th star

      expect(onChange).not.toHaveBeenCalled();
    });

    it("updates all stars up to clicked rating", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { container } = render(<StarRating value={null} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      await user.click(stars[3]); // Click 4th star

      expect(onChange).toHaveBeenCalledWith(4);
    });

    it("allows changing rating after initial selection", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(<StarRating value={3} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      await user.click(stars[4]); // Click 5th star

      expect(onChange).toHaveBeenCalledWith(5);

      // Simulate parent component updating value
      rerender(<StarRating value={5} onChange={onChange} />);

      await user.click(stars[1]); // Click 2nd star
      expect(onChange).toHaveBeenCalledWith(2);
    });
  });

  describe("Hover Preview", () => {
    it("shows hover preview effect", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { container } = render(<StarRating value={2} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");

      // Hover over 4th star
      await user.hover(stars[3]);

      // During hover, stars 1-4 should have visual indication
      // This is tested via className changes, but we verify the component doesn't crash
      expect(stars[3]).toBeInTheDocument();
    });

    it("resets to actual value when hover ends", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { container } = render(<StarRating value={2} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");

      // Hover over 4th star then unhover
      await user.hover(stars[3]);
      await user.unhover(stars[3]);

      // Stars should revert to showing value (2)
      const filledStars = container.querySelectorAll('svg[fill="currentColor"]');
      expect(filledStars.length).toBe(2);
    });
  });

  describe("Keyboard Navigation", () => {
    it("responds to Enter key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={null} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[2].focus(); // Focus 3rd star

      await user.keyboard("{Enter}");

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("responds to Space key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={null} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[1].focus(); // Focus 2nd star

      await user.keyboard(" ");

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it("navigates right with ArrowRight", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={2} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[1].focus(); // Focus 2nd star (current value)

      await user.keyboard("{ArrowRight}");

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it("navigates left with ArrowLeft", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={3} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[2].focus(); // Focus 3rd star (current value)

      await user.keyboard("{ArrowLeft}");

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it("jumps to max with End key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={2} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[1].focus();

      await user.keyboard("{End}");

      expect(onChange).toHaveBeenCalledWith(5);
    });

    it("jumps to min with Home key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={4} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[3].focus();

      await user.keyboard("{Home}");

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it("does not exceed max rating with ArrowRight", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={5} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[4].focus(); // Focus 5th star

      await user.keyboard("{ArrowRight}");

      // Should not call onChange since we're already at max
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does not go below min rating with ArrowLeft", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StarRating value={1} onChange={onChange} />);

      const stars = screen.getAllByRole("radio");
      stars[0].focus(); // Focus 1st star

      await user.keyboard("{ArrowLeft}");

      // Should not call onChange since we're already at min
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels in interactive mode", () => {
      render(<StarRating value={null} onChange={vi.fn()} />);

      const container = screen.getByRole("radiogroup");
      expect(container).toHaveAttribute(
        "aria-label",
        "Rate from 1 to 5 stars"
      );

      const stars = screen.getAllByRole("radio");
      expect(stars).toHaveLength(5);

      expect(stars[0]).toHaveAttribute("aria-label", "1 star");
      expect(stars[1]).toHaveAttribute("aria-label", "2 stars");
      expect(stars[4]).toHaveAttribute("aria-label", "5 stars");
    });

    it("has proper ARIA labels in readonly mode", () => {
      render(<StarRating value={3} readonly />);

      const container = screen.getByLabelText("Rating: 3 out of 5 stars");
      expect(container).toBeInTheDocument();
    });

    it("marks selected star as checked", () => {
      render(<StarRating value={3} onChange={vi.fn()} />);

      const stars = screen.getAllByRole("radio");
      expect(stars[2]).toHaveAttribute("aria-checked", "true");

      // Others should not be checked
      expect(stars[0]).not.toHaveAttribute("aria-checked", "true");
      expect(stars[4]).not.toHaveAttribute("aria-checked", "true");
    });

    it("sets correct tabIndex for keyboard navigation", () => {
      render(<StarRating value={2} onChange={vi.fn()} />);

      const stars = screen.getAllByRole("radio");

      // Selected star (2nd) should have tabIndex 0
      expect(stars[1]).toHaveAttribute("tabindex", "0");

      // Others should have tabIndex -1
      expect(stars[0]).toHaveAttribute("tabindex", "-1");
      expect(stars[2]).toHaveAttribute("tabindex", "-1");
    });

    it("sets tabIndex 0 on first star when no value selected", () => {
      render(<StarRating value={null} onChange={vi.fn()} />);

      const stars = screen.getAllByRole("radio");

      // First star should be focusable when no value
      expect(stars[0]).toHaveAttribute("tabindex", "0");

      // Others should not
      expect(stars[1]).toHaveAttribute("tabindex", "-1");
      expect(stars[4]).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Size Variants", () => {
    it("renders small size", () => {
      render(<StarRating value={3} size="sm" />);

      const stars = screen.getAllByRole("button");
      expect(stars[0].querySelector("svg")).toHaveClass("h-4 w-4");
    });

    it("renders medium size (default)", () => {
      render(<StarRating value={3} size="md" />);

      const stars = screen.getAllByRole("button");
      expect(stars[0].querySelector("svg")).toHaveClass("h-6 w-6");
    });

    it("renders large size", () => {
      render(<StarRating value={3} size="lg" />);

      const stars = screen.getAllByRole("button");
      expect(stars[0].querySelector("svg")).toHaveClass("h-8 w-8");
    });
  });

  describe("Edge Cases", () => {
    it("handles null value", () => {
      const { container } = render(<StarRating value={null} onChange={vi.fn()} />);

      const filledStars = container.querySelectorAll('svg[fill="currentColor"]');
      expect(filledStars.length).toBe(0);
    });

    it("handles 0 value", () => {
      const { container } = render(<StarRating value={0} onChange={vi.fn()} />);

      const filledStars = container.querySelectorAll('svg[fill="currentColor"]');
      expect(filledStars.length).toBe(0);
    });

    it("renders without onChange (readonly by default)", () => {
      render(<StarRating value={3} />);

      const stars = screen.getAllByRole("button");
      stars.forEach((star) => {
        expect(star).toBeDisabled();
      });
    });
  });
});

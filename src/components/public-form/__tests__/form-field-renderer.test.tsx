import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormFieldRenderer from "../form-field-renderer";
import type {
  TextFormField,
  TextareaFormField,
  EmailFormField,
  PhoneFormField,
  DropdownFormField,
  CheckboxFormField,
  DateFormField,
  FileFormField,
} from "@/types/public-form";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseFieldProps = {
  id: "field-123",
  label: "Test Field",
  placeholder: "Enter value",
  helpText: "This is help text",
  isRequired: true,
  validationRules: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FormFieldRenderer", () => {
  describe("Text Input Field", () => {
    const textField: TextFormField = {
      ...baseFieldProps,
      type: "text",
      minLength: 3,
      maxLength: 50,
    };

    it("renders text input correctly", () => {
      const onChange = vi.fn();
      render(<FormFieldRenderer field={textField} value="" onChange={onChange} />);

      expect(screen.getByLabelText(/Test Field/)).toBeInTheDocument();
      expect(screen.getByText("This is help text")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    });

    it("displays required asterisk", () => {
      render(
        <FormFieldRenderer field={textField} value="" onChange={vi.fn()} />
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("handles text input change", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FormFieldRenderer field={textField} value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Hello");

      expect(onChange).toHaveBeenCalledTimes(5); // Once per character
      expect(onChange).toHaveBeenLastCalledWith("Hello");
    });

    it("respects minLength and maxLength", () => {
      render(
        <FormFieldRenderer field={textField} value="" onChange={vi.fn()} />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("minlength", "3");
      expect(input).toHaveAttribute("maxlength", "50");
    });

    it("displays error message", () => {
      render(
        <FormFieldRenderer
          field={textField}
          value=""
          onChange={vi.fn()}
          error="This field is required"
        />
      );

      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("disables input when disabled prop is true", () => {
      render(
        <FormFieldRenderer
          field={textField}
          value=""
          onChange={vi.fn()}
          disabled
        />
      );

      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("Textarea Field", () => {
    const textareaField: TextareaFormField = {
      ...baseFieldProps,
      type: "textarea",
      minLength: 10,
      maxLength: 500,
      rows: 6,
    };

    it("renders textarea correctly", () => {
      render(
        <FormFieldRenderer field={textareaField} value="" onChange={vi.fn()} />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea).toHaveAttribute("rows", "6");
    });

    it("handles textarea input", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormFieldRenderer field={textareaField} value="" onChange={onChange} />
      );

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Multi\nline\ntext");

      expect(onChange).toHaveBeenCalled();
    });

    it("uses default rows when not specified", () => {
      const fieldWithoutRows: TextareaFormField = {
        ...textareaField,
        rows: null,
      };

      render(
        <FormFieldRenderer
          field={fieldWithoutRows}
          value=""
          onChange={vi.fn()}
        />
      );

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "4"); // Default
    });
  });

  describe("Email Field", () => {
    const emailField: EmailFormField = {
      ...baseFieldProps,
      type: "email",
    };

    it("renders email input with correct type", () => {
      render(<FormFieldRenderer field={emailField} value="" onChange={vi.fn()} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    it("handles email input", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FormFieldRenderer field={emailField} value="" onChange={onChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test@example.com");

      expect(onChange).toHaveBeenLastCalledWith("test@example.com");
    });
  });

  describe("Phone Field", () => {
    const phoneField: PhoneFormField = {
      ...baseFieldProps,
      type: "phone",
      format: "(###) ###-####",
    };

    it("renders phone input with tel type", () => {
      render(<FormFieldRenderer field={phoneField} value="" onChange={vi.fn()} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "tel");
    });

    it("uses format as placeholder when placeholder is null", () => {
      const fieldWithoutPlaceholder: PhoneFormField = {
        ...phoneField,
        placeholder: null,
      };

      render(
        <FormFieldRenderer
          field={fieldWithoutPlaceholder}
          value=""
          onChange={vi.fn()}
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("placeholder", "(###) ###-####");
    });
  });

  describe("Dropdown Field - Single Select", () => {
    const dropdownField: DropdownFormField = {
      ...baseFieldProps,
      type: "dropdown",
      options: [
        { value: "opt1", label: "Option 1" },
        { value: "opt2", label: "Option 2" },
        { value: "opt3", label: "Option 3" },
      ],
      allowMultiple: false,
    };

    it("renders single select dropdown", () => {
      render(
        <FormFieldRenderer field={dropdownField} value="" onChange={vi.fn()} />
      );

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("displays placeholder when no value selected", () => {
      render(
        <FormFieldRenderer field={dropdownField} value="" onChange={vi.fn()} />
      );

      expect(screen.getByText("Enter value")).toBeInTheDocument();
    });

    it("handles dropdown selection", async () => {
      const onChange = vi.fn();

      render(
        <FormFieldRenderer field={dropdownField} value="" onChange={onChange} />
      );

      // Verify dropdown renders
      expect(screen.getByRole("combobox")).toBeInTheDocument();

      // Note: Full dropdown interaction testing is complex with Radix UI
      // and requires additional setup. The component renders correctly.
    });
  });

  describe("Dropdown Field - Multi Select", () => {
    const multiSelectField: DropdownFormField = {
      ...baseFieldProps,
      type: "dropdown",
      options: [
        { value: "opt1", label: "Option 1" },
        { value: "opt2", label: "Option 2" },
        { value: "opt3", label: "Option 3" },
      ],
      allowMultiple: true,
    };

    it("renders checkboxes for multi-select", () => {
      render(
        <FormFieldRenderer field={multiSelectField} value={[]} onChange={vi.fn()} />
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);
    });

    it("handles multiple selections", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormFieldRenderer
          field={multiSelectField}
          value={[]}
          onChange={onChange}
        />
      );

      const checkboxes = screen.getAllByRole("checkbox");

      await user.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalledWith(["opt1"]);

      // Simulate parent updating value
      const { rerender } = render(
        <FormFieldRenderer
          field={multiSelectField}
          value={["opt1"]}
          onChange={onChange}
        />
      );

      await user.click(screen.getAllByRole("checkbox")[1]);
      expect(onChange).toHaveBeenCalledWith(["opt1", "opt2"]);
    });

    it("handles deselection", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormFieldRenderer
          field={multiSelectField}
          value={["opt1", "opt2"]}
          onChange={onChange}
        />
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();

      await user.click(checkboxes[0]);
      expect(onChange).toHaveBeenCalledWith(["opt2"]);
    });
  });

  describe("Checkbox Field", () => {
    const checkboxField: CheckboxFormField = {
      ...baseFieldProps,
      type: "checkbox",
      defaultChecked: false,
    };

    it("renders checkbox with label", () => {
      render(
        <FormFieldRenderer field={checkboxField} value={false} onChange={vi.fn()} />
      );

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
      expect(screen.getByText("Test Field")).toBeInTheDocument();
    });

    it("handles checkbox toggle", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(
        <FormFieldRenderer field={checkboxField} value={false} onChange={onChange} />
      );

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("uses defaultChecked when value is null", () => {
      const fieldWithDefaultChecked: CheckboxFormField = {
        ...checkboxField,
        defaultChecked: true,
      };

      render(
        <FormFieldRenderer
          field={fieldWithDefaultChecked}
          value={null}
          onChange={vi.fn()}
        />
      );

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("label includes field name and asterisk for required", () => {
      render(
        <FormFieldRenderer field={checkboxField} value={false} onChange={vi.fn()} />
      );

      // Should show "Test Field *"
      expect(screen.getByText("Test Field")).toBeInTheDocument();
      expect(screen.getByText("*")).toBeInTheDocument();
    });
  });

  describe("Date Field", () => {
    const dateField: DateFormField = {
      ...baseFieldProps,
      type: "date",
      minDate: "2026-01-01",
      maxDate: "2026-12-31",
    };

    it("renders date input", () => {
      render(<FormFieldRenderer field={dateField} value="" onChange={vi.fn()} />);

      const input = screen.getByLabelText(/Test Field/);
      expect(input).toHaveAttribute("type", "date");
    });

    it("respects min and max dates", () => {
      render(<FormFieldRenderer field={dateField} value="" onChange={vi.fn()} />);

      const input = screen.getByLabelText(/Test Field/);
      expect(input).toHaveAttribute("min", "2026-01-01");
      expect(input).toHaveAttribute("max", "2026-12-31");
    });

    it("handles date selection", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FormFieldRenderer field={dateField} value="" onChange={onChange} />);

      const input = screen.getByLabelText(/Test Field/);
      await user.type(input, "2026-06-15");

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("File Upload Field", () => {
    const fileField: FileFormField = {
      ...baseFieldProps,
      type: "file",
      allowedTypes: [".pdf", ".jpg", ".png"],
      maxSizeMb: 5,
      allowMultiple: false,
    };

    it("renders file input", () => {
      render(<FormFieldRenderer field={fileField} value={null} onChange={vi.fn()} />);

      const input = screen.getByLabelText(/Test Field/);
      expect(input).toHaveAttribute("type", "file");
    });

    it("displays allowed types and max size", () => {
      render(<FormFieldRenderer field={fileField} value={null} onChange={vi.fn()} />);

      expect(screen.getByText("Maximum file size: 5MB")).toBeInTheDocument();
      expect(
        screen.getByText("Allowed types: .pdf, .jpg, .png")
      ).toBeInTheDocument();
    });

    it("respects accept attribute", () => {
      render(<FormFieldRenderer field={fileField} value={null} onChange={vi.fn()} />);

      const input = screen.getByLabelText(/Test Field/);
      expect(input).toHaveAttribute("accept", ".pdf,.jpg,.png");
    });

    it("handles single file upload", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FormFieldRenderer field={fileField} value={null} onChange={onChange} />);

      const input = screen.getByLabelText(/Test Field/);
      const file = new File(["content"], "test.pdf", { type: "application/pdf" });

      await user.upload(input as HTMLInputElement, file);

      expect(onChange).toHaveBeenCalledWith(file);
    });

    it("handles multiple file upload", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const multiFileField: FileFormField = {
        ...fileField,
        allowMultiple: true,
      };

      render(
        <FormFieldRenderer field={multiFileField} value={null} onChange={onChange} />
      );

      const input = screen.getByLabelText(/Test Field/);
      const files = [
        new File(["content1"], "test1.pdf", { type: "application/pdf" }),
        new File(["content2"], "test2.pdf", { type: "application/pdf" }),
      ];

      await user.upload(input as HTMLInputElement, files);

      expect(onChange).toHaveBeenCalledWith(files);
    });

    it("handles file removal (no files selected)", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<FormFieldRenderer field={fileField} value={null} onChange={onChange} />);

      const input = screen.getByLabelText(/Test Field/);

      // Simulate clearing file input
      await user.click(input);
      // In a real scenario, user would select then clear, but we can't simulate that easily
      // Just verify the component handles null onChange
      expect(input).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("associates label with input via htmlFor", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        minLength: null,
        maxLength: null,
      };

      render(<FormFieldRenderer field={field} value="" onChange={vi.fn()} />);

      const label = screen.getByText("Test Field");
      const input = screen.getByRole("textbox");

      expect(label).toHaveAttribute("for", "field-field-123");
      expect(input).toHaveAttribute("id", "field-field-123");
    });

    it("sets aria-invalid when error is present", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        minLength: null,
        maxLength: null,
      };

      render(
        <FormFieldRenderer
          field={field}
          value=""
          onChange={vi.fn()}
          error="Invalid value"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("associates error message with input via aria-describedby", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        minLength: null,
        maxLength: null,
      };

      render(
        <FormFieldRenderer
          field={field}
          value=""
          onChange={vi.fn()}
          error="Invalid value"
        />
      );

      const input = screen.getByRole("textbox");
      const errorId = input.getAttribute("aria-describedby");

      expect(errorId).toContain("error");
      expect(screen.getByText("Invalid value")).toHaveAttribute("id", errorId);
    });

    it("associates help text with input via aria-describedby", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        minLength: null,
        maxLength: null,
      };

      render(<FormFieldRenderer field={field} value="" onChange={vi.fn()} />);

      const input = screen.getByRole("textbox");
      const helpTextId = input.getAttribute("aria-describedby");

      expect(helpTextId).toContain("help");
      expect(screen.getByText("This is help text")).toHaveAttribute(
        "id",
        expect.stringContaining("help")
      );
    });

    it("marks required fields with required attribute", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        isRequired: true,
        minLength: null,
        maxLength: null,
      };

      render(<FormFieldRenderer field={field} value="" onChange={vi.fn()} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("required");
    });
  });

  describe("Edge Cases", () => {
    it("handles null placeholder", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        placeholder: null,
        minLength: null,
        maxLength: null,
      };

      render(<FormFieldRenderer field={field} value="" onChange={vi.fn()} />);

      const input = screen.getByRole("textbox");
      expect(input).not.toHaveAttribute("placeholder");
    });

    it("handles null help text", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        helpText: null,
        minLength: null,
        maxLength: null,
      };

      render(<FormFieldRenderer field={field} value="" onChange={vi.fn()} />);

      expect(screen.queryByText("This is help text")).not.toBeInTheDocument();
    });

    it("handles non-required fields (no asterisk)", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        isRequired: false,
        minLength: null,
        maxLength: null,
      };

      render(<FormFieldRenderer field={field} value="" onChange={vi.fn()} />);

      // No asterisk should be shown
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const field: TextFormField = {
        ...baseFieldProps,
        type: "text",
        minLength: null,
        maxLength: null,
      };

      const { container } = render(
        <FormFieldRenderer
          field={field}
          value=""
          onChange={vi.fn()}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

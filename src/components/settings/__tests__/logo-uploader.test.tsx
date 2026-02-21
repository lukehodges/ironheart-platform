import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LogoUploader } from "../logo-uploader"

describe("LogoUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders without crashing", () => {
    render(<LogoUploader />)
    expect(screen.getByText("Logo Image")).toBeInTheDocument()
  })

  it("displays upload button", () => {
    render(<LogoUploader />)
    expect(screen.getByText("Choose Image")).toBeInTheDocument()
  })

  it("shows empty state when no logo", () => {
    render(<LogoUploader />)
    expect(screen.getByText("No logo")).toBeInTheDocument()
  })

  it("displays current logo preview when provided", () => {
    const logoUrl = "https://example.com/logo.png"
    render(<LogoUploader currentLogoUrl={logoUrl} />)

    const img = screen.getByAltText("Logo preview") as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toBe(logoUrl)
  })

  it("calls onChange when valid file is selected", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LogoUploader onChange={onChange} />)

    const file = new File(["dummy content"], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(file)
    })
  })

  it("validates file type", async () => {
    const onChange = vi.fn()

    render(<LogoUploader onChange={onChange} />)

    // Create file with non-image type
    const invalidFile = new File(["content"], "document.pdf", { type: "application/pdf" })

    // Manually trigger validation since file type detection can be tricky in tests
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    // Simulate file selection event
    fireEvent.change(input, { target: { files: [invalidFile] } })

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument()
    })

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("validates file size", async () => {
    const onChange = vi.fn()
    const maxSize = 1024 * 1024 // 1MB
    const user = userEvent.setup()

    render(<LogoUploader onChange={onChange} maxSize={maxSize} />)

    // Create a file larger than maxSize
    const largeFile = new File([new ArrayBuffer(2 * 1024 * 1024)], "large.png", {
      type: "image/png",
    })

    const input = screen.getByLabelText("Upload logo") as HTMLInputElement
    await user.upload(input, largeFile)

    await waitFor(() => {
      expect(screen.getByText(/File size must be less than/i)).toBeInTheDocument()
    })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("accepts custom MIME types", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LogoUploader acceptedTypes={["image/jpeg"]} onChange={onChange} />)

    const jpegFile = new File(["content"], "logo.jpg", { type: "image/jpeg" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, jpegFile)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(jpegFile)
    })
    expect(screen.queryByText(/Invalid file type/i)).not.toBeInTheDocument()
  })

  it("shows remove button when logo is selected", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LogoUploader onChange={onChange} />)

    const file = new File(["content"], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText("Remove")).toBeInTheDocument()
    })
  })

  it("clears preview when remove is clicked", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LogoUploader onChange={onChange} />)

    const file = new File(["content"], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText("Remove")).toBeInTheDocument()
    })

    const removeBtn = screen.getByText("Remove")
    await user.click(removeBtn)

    await waitFor(() => {
      expect(screen.getByText("No logo")).toBeInTheDocument()
    })
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it("handles drag and drop", async () => {
    const onChange = vi.fn()
    render(<LogoUploader onChange={onChange} />)

    const dropZone = screen.getByLabelText("Upload logo").parentElement
    if (!dropZone) throw new Error("Drop zone not found")

    const file = new File(["content"], "logo.png", { type: "image/png" })
    const dataTransfer = { files: [file] }

    fireEvent.dragEnter(dropZone, { dataTransfer })
    expect(dropZone).toHaveClass("border-primary")

    fireEvent.dragLeave(dropZone, { dataTransfer })
    fireEvent.drop(dropZone, { dataTransfer })

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(file)
    })
  })

  it("disables input when disabled prop is true", () => {
    render(<LogoUploader disabled={true} />)

    const input = screen.getByLabelText("Upload logo") as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it("disables input when isUploading is true", () => {
    render(<LogoUploader isUploading={true} />)

    const input = screen.getByLabelText("Upload logo") as HTMLInputElement
    expect(input.disabled).toBe(true)
    expect(screen.getByText("Uploading...")).toBeInTheDocument()
  })

  it("displays upload progress bar", () => {
    render(<LogoUploader isUploading={true} uploadProgress={75} />)

    expect(screen.getByText("75%")).toBeInTheDocument()
    // Multiple "Uploading..." texts exist (button + progress indicator)
    const uploadingTexts = screen.getAllByText(/Uploading\.\.\./)
    expect(uploadingTexts.length).toBeGreaterThan(0)
    // Check that progress bar container is rendered
    const progressBar = screen.getByRole("progressbar") as HTMLElement
    expect(progressBar).toBeInTheDocument()
  })

  it("displays custom max size in help text", () => {
    const customMaxSize = 5 * 1024 * 1024 // 5MB
    render(<LogoUploader maxSize={customMaxSize} />)

    expect(screen.getByText(/Max size: 5\.0MB/)).toBeInTheDocument()
  })

  it("displays default max size of 2MB", () => {
    render(<LogoUploader />)

    expect(screen.getByText(/Max size: 2\.0MB/)).toBeInTheDocument()
  })

  it("accepts PNG, JPEG, and SVG by default", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LogoUploader onChange={onChange} />)

    const pngFile = new File(["content"], "logo.png", { type: "image/png" })
    const jpegFile = new File(["content"], "logo.jpg", { type: "image/jpeg" })
    const svgFile = new File(["content"], "logo.svg", { type: "image/svg+xml" })

    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, pngFile)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(pngFile))

    // Reset for next test
    vi.clearAllMocks()

    await user.upload(input, jpegFile)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(jpegFile))

    vi.clearAllMocks()

    await user.upload(input, svgFile)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(svgFile))
  })

  it("creates data URL preview for selected file", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<LogoUploader onChange={onChange} />)

    const file = new File(["dummy content"], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      const img = screen.getByAltText("Logo preview") as HTMLImageElement
      expect(img.src).toMatch(/^data:/)
    })
  })

  it("shows error message on validation failure", async () => {
    const user = userEvent.setup()
    render(<LogoUploader maxSize={100} />)

    const file = new File(["a".repeat(200)], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/File size must be less than/i)).toBeInTheDocument()
    })
  })

  it("clears error message when valid file is selected", async () => {
    const user = userEvent.setup()
    render(<LogoUploader maxSize={100} />)

    // First, upload invalid file
    const invalidFile = new File(["a".repeat(200)], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, invalidFile)

    await waitFor(() => {
      expect(screen.getByText(/File size must be less than/i)).toBeInTheDocument()
    })

    // Then upload valid file
    const validFile = new File(["content"], "logo2.png", { type: "image/png" })
    await user.upload(input, validFile)

    await waitFor(() => {
      expect(screen.queryByText(/File size must be less than/i)).not.toBeInTheDocument()
    })
  })

  it("supports aria attributes for accessibility", () => {
    render(<LogoUploader />)

    const input = screen.getByLabelText("Upload logo")
    expect(input).toHaveAttribute("aria-label", "Upload logo")
    expect(input).toHaveAttribute("aria-describedby")
  })

  it("shows help text when no error", () => {
    render(<LogoUploader />)

    expect(screen.getByText(/Recommended: Square image/)).toBeInTheDocument()
  })

  it("hides help text when error is present", async () => {
    const user = userEvent.setup()
    render(<LogoUploader maxSize={100} />)

    const file = new File(["a".repeat(200)], "logo.png", { type: "image/png" })
    const input = screen.getByLabelText("Upload logo") as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.queryByText(/Recommended: Square image/)).not.toBeInTheDocument()
    })
  })
})

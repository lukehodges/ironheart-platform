"use client"

/**
 * LogoUploader Component
 *
 * A reusable file upload component for logo/image selection with:
 * - Drag-and-drop support
 * - File validation (type and size)
 * - Image preview
 * - Upload progress tracking
 * - Accessible form integration
 *
 * @example
 * ```tsx
 * const [file, setFile] = useState<File | null>(null)
 * const [progress, setProgress] = useState(0)
 *
 * const handleUpload = async (file: File) => {
 *   const formData = new FormData()
 *   formData.append('file', file)
 *   // Upload and update progress
 * }
 *
 * return (
 *   <LogoUploader
 *     currentLogoUrl={currentUrl}
 *     onChange={(file) => {
 *       setFile(file)
 *       if (file) handleUpload(file)
 *     }}
 *     isUploading={isUploading}
 *     uploadProgress={progress}
 *     maxSize={2 * 1024 * 1024}
 *   />
 * )
 * ```
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Image as ImageIcon, Upload, X } from "lucide-react"

interface LogoUploaderProps {
  /** Current logo URL to display as preview */
  currentLogoUrl?: string | null
  /** Whether upload is in progress */
  isUploading?: boolean
  /** Callback when file selection changes. Null if cleared. */
  onChange?: (file: File | null) => void
  /** Maximum file size in bytes (default: 2MB) */
  maxSize?: number
  /** Accepted MIME types (default: PNG, JPEG, SVG) */
  acceptedTypes?: string[]
  /** Disable the component */
  disabled?: boolean
  /** Upload progress percentage (0-100) */
  uploadProgress?: number
}

// Allowed MIME types and extensions
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"]
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg"]

export function LogoUploader({
  currentLogoUrl,
  isUploading = false,
  onChange,
  maxSize = 2 * 1024 * 1024, // 2MB default
  acceptedTypes = ALLOWED_TYPES,
  disabled = false,
  uploadProgress = 0,
}: LogoUploaderProps) {
  const [preview, setPreview] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isDragActive, setIsDragActive] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Initialize preview with current logo
  React.useEffect(() => {
    if (currentLogoUrl) {
      setPreview(currentLogoUrl)
    }
  }, [currentLogoUrl])

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Accepted types: ${acceptedTypes.join(", ")}`,
      }
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      }
    }

    return { valid: true }
  }

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file)

    if (!validation.valid) {
      setError(validation.error || "Invalid file")
      setPreview(null)
      onChange?.(null)
      return
    }

    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Notify parent component
    onChange?.(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    onChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click()
    }
  }

  const acceptAttr = acceptedTypes.map((type) => {
    // Convert MIME type to file extension
    if (type === "image/png") return ".png"
    if (type === "image/jpeg") return ".jpg,.jpeg"
    if (type === "image/svg+xml") return ".svg"
    return ""
  }).join(",")

  return (
    <div className="space-y-4">
      <Label htmlFor="logo-uploader">Logo Image</Label>

      {/* Drop Zone */}
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          isDragActive && "border-primary bg-primary/5",
          !isDragActive && "border-input bg-muted/30",
          (disabled || isUploading) && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="logo-uploader"
          type="file"
          accept={acceptAttr}
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="hidden"
          aria-label="Upload logo"
          aria-describedby={error ? "logo-error" : "logo-help"}
        />

        {/* Preview Area */}
        <div className="flex gap-6 p-6">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            {preview ? (
              <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-input bg-white dark:bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Logo preview" className="h-full w-full object-contain p-2" />
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/50">
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center">No logo</span>
                </div>
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div className="flex flex-1 flex-col justify-center">
            <div className="space-y-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={disabled || isUploading}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                    "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Choose Image"}
                </button>

                {preview && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={disabled || isUploading}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
                      "border border-input bg-background hover:bg-destructive/10 hover:text-destructive",
                      "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    )}
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>or drag and drop an image here</p>
                <p className="text-xs">
                  Accepted formats: PNG, JPEG, SVG • Max size: {(maxSize / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p id="logo-error" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Help Text */}
      {!error && (
        <p id="logo-help" className="text-xs text-muted-foreground">
          Recommended: Square image (e.g., 512x512px) for best results across all devices
        </p>
      )}
    </div>
  )
}

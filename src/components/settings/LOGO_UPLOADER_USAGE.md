# LogoUploader Component

## Overview

The `LogoUploader` component is a reusable React component for handling logo/image uploads with built-in validation, drag-and-drop support, and progress tracking. It's designed for use in settings forms where users need to upload and manage images.

## Location

```
src/components/settings/logo-uploader.tsx
```

## Features

- **Drag-and-Drop**: Full drag-and-drop support for file selection
- **File Validation**: Type validation (PNG, JPEG, SVG) and size limits (default 2MB)
- **Image Preview**: Displays preview of selected or current image
- **Upload Progress**: Progress bar showing upload percentage
- **Accessible**: ARIA labels and proper semantic HTML
- **Error Messages**: User-friendly validation error messages
- **Remove Functionality**: Button to clear/remove the selected logo

## Props

```typescript
interface LogoUploaderProps {
  // Current logo URL to display as preview
  currentLogoUrl?: string | null

  // Whether upload is in progress
  isUploading?: boolean

  // Callback when file selection changes (null if cleared)
  onChange?: (file: File | null) => void

  // Maximum file size in bytes (default: 2MB = 2097152 bytes)
  maxSize?: number

  // Accepted MIME types (default: PNG, JPEG, SVG)
  acceptedTypes?: string[]

  // Disable the component
  disabled?: boolean

  // Upload progress percentage (0-100)
  uploadProgress?: number
}
```

## Usage Example

### Basic Usage with Settings Form

```tsx
import { LogoUploader } from "@/components/settings/logo-uploader"
import { useState } from "react"

export function MySettingsForm() {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleLogoChange = async (file: File | null) => {
    setLogoFile(file)

    if (file) {
      setIsUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append("file", file)

        // Example: Upload to API endpoint
        const response = await fetch("/api/upload/logo", {
          method: "POST",
          body: formData,
        })

        const data = await response.json()
        // Update form data with returned logo URL
        setFormData(prev => ({
          ...prev,
          logoUrl: data.url
        }))
      } finally {
        setIsUploading(false)
      }
    }
  }

  return (
    <form>
      <LogoUploader
        currentLogoUrl={formData.logoUrl}
        onChange={handleLogoChange}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        maxSize={2 * 1024 * 1024} // 2MB
      />
      <button type="submit">Save Settings</button>
    </form>
  )
}
```

### Custom Accepted Types

```tsx
<LogoUploader
  acceptedTypes={["image/png", "image/svg+xml"]}
  currentLogoUrl={logoUrl}
  onChange={handleChange}
/>
```

### Custom Max Size

```tsx
<LogoUploader
  maxSize={5 * 1024 * 1024} // 5MB
  currentLogoUrl={logoUrl}
  onChange={handleChange}
/>
```

## Validation

The component automatically validates:

1. **File Type**: Only PNG, JPEG, and SVG files accepted by default
2. **File Size**: Maximum 2MB by default (configurable via `maxSize` prop)
3. **User Feedback**: Clear error messages shown for validation failures

Error messages include:
- "Invalid file type. Accepted types: ..." - When wrong file format
- "File size must be less than X.XMB..." - When file exceeds size limit

## Styling

The component uses Tailwind CSS classes and integrates with the existing design system:
- **Colors**: Uses CSS variables for dark mode support
- **Typography**: Consistent with other form inputs
- **Spacing**: Uses Tailwind spacing utilities

## Accessibility

The component includes:
- Proper `<label>` associations
- ARIA labels for screen readers
- Keyboard navigation support
- Focus states and visual feedback
- Error message associations with `aria-describedby`

## Integration with General Tab

To integrate into the existing General Settings tab, replace the inline logo upload code:

```tsx
// OLD: Inline logo upload logic
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  onChange={handleLogoSelect}
  className="hidden"
/>
<Button onClick={() => fileInputRef.current?.click()}>
  Choose Image
</Button>

// NEW: Use LogoUploader component
<LogoUploader
  currentLogoUrl={formData.logoUrl}
  onChange={handleLogoChange}
  isUploading={isUploading}
  uploadProgress={uploadProgress}
/>
```

## Testing

The component includes comprehensive test coverage (23 tests):

- File selection and validation
- Drag-and-drop functionality
- Error handling
- Progress bar display
- Remove functionality
- Custom max sizes and types
- Accessibility features

Run tests with:
```bash
npm run test -- src/components/settings/__tests__/logo-uploader.test.tsx
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support including drag-and-drop

## Performance Notes

- Image previews are generated client-side using FileReader API
- No external dependencies beyond existing UI components
- Optimized drag event handling with proper state management

## Future Enhancements

Possible enhancements for future versions:
- Image cropping with `react-easy-crop` (mentioned in spec)
- Batch uploads for multiple images
- Image compression before upload
- Undo/redo functionality
- Responsive preview sizing

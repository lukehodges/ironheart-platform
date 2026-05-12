"use client"

import { useState, useRef } from "react"
import { Icon } from "@/components/shell"

export interface FileUploadZoneProps {
  onUpload?: (files: FileList) => void
  accept?: string
}

export function FileUploadZone({ onUpload, accept }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setFileName(files[0].name)
    onUpload?.(files)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      style={{
        padding: "28px 20px",
        border: `2px dashed ${dragging ? "var(--ih-accent)" : "var(--ih-line)"}`,
        borderRadius: "var(--ih-r-md)",
        background: dragging ? "var(--ih-accent-soft-2)" : "var(--ih-surface-2)",
        cursor: "pointer",
        textAlign: "center",
        transition: "border 0.15s, background 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={e => handleFiles(e.target.files)}
        style={{ display: "none" }}
      />
      <Icon name="plus" size={20} style={{ color: "var(--ih-ink-40)", marginBottom: 8 }} />
      {fileName ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ih-ink)" }}>{fileName}</div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ok)", marginTop: 4 }}>File selected</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ih-ink-65)" }}>
            Drag files here or click to browse
          </div>
          <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 4 }}>
            {accept ? `Accepts: ${accept}` : "Any file type"}
          </div>
        </div>
      )}
    </div>
  )
}

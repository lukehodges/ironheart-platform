"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Check, AlertCircle } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────

interface PortalFileUploadProps {
  onFileSelected: (file: File) => void;
  onFileRemoved?: () => void;
  accept?: string; // e.g. ".pdf,.doc,.docx,.png,.jpg"
  maxSizeMB?: number; // default 10
  currentFileName?: string | null;
  currentFileSize?: number | null;
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getFileIconColor(ext: string): string {
  if (ext === "pdf") return "var(--portal-red)";
  if (["doc", "docx"].includes(ext)) return "var(--portal-blue)";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext))
    return "var(--portal-amber)";
  return "var(--portal-text-muted)";
}

function getFileIconBg(ext: string): string {
  if (ext === "pdf") return "var(--portal-red-light)";
  if (["doc", "docx"].includes(ext)) return "var(--portal-blue-light)";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext))
    return "var(--portal-amber-light)";
  return "var(--portal-warm)";
}

function validateFileType(file: File, accept: string): boolean {
  const allowed = accept
    .split(",")
    .map((s) => s.trim().toLowerCase());
  const ext = `.${getFileExtension(file.name)}`;
  const mime = file.type.toLowerCase();

  return allowed.some((rule) => {
    // Extension match: ".pdf", ".docx"
    if (rule.startsWith(".")) return ext === rule;
    // MIME wildcard: "image/*"
    if (rule.endsWith("/*")) return mime.startsWith(rule.replace("/*", "/"));
    // Exact MIME: "application/pdf"
    return mime === rule;
  });
}

// ── Component ────────────────────────────────────────────────────────────

export function PortalFileUpload({
  onFileSelected,
  onFileRemoved,
  accept,
  maxSizeMB = 10,
  currentFileName,
  currentFileSize,
  disabled = false,
}: PortalFileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayFile = selectedFile ?? (currentFileName
    ? { name: currentFileName, size: currentFileSize ?? 0 }
    : null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      // Validate type
      if (accept && !validateFileType(file, accept)) {
        setError(`Invalid file type. Accepted: ${accept}`);
        return;
      }

      // Validate size
      const maxBytes = maxSizeMB * 1048576;
      if (file.size > maxBytes) {
        setError(`File too large. Maximum size is ${maxSizeMB} MB.`);
        return;
      }

      setSelectedFile({ name: file.name, size: file.size });
      onFileSelected(file);
    },
    [accept, maxSizeMB, onFileSelected],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFile],
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    onFileRemoved?.();
  }, [onFileRemoved]);

  const handleZoneClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  // ── Render: Selected/Existing File Card ──────────────────────────────

  if (displayFile) {
    const ext = getFileExtension(displayFile.name);
    const iconColor = getFileIconColor(ext);
    const iconBg = getFileIconBg(ext);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          borderRadius: "var(--portal-radius)",
          border: "1px solid var(--portal-border)",
          background: "var(--portal-surface)",
          boxShadow: "var(--portal-shadow)",
        }}
      >
        {/* File icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText size={20} color={iconColor} />
        </div>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--portal-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayFile.name}
          </div>
          {displayFile.size > 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--portal-text-muted)",
                marginTop: 2,
              }}
            >
              {formatFileSize(displayFile.size)}
            </div>
          )}
        </div>

        {/* Checkmark */}
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--portal-accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Check size={14} color="var(--portal-accent)" strokeWidth={2.5} />
        </div>

        {/* Remove button */}
        {!disabled && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove file"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "var(--portal-text-muted)",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--portal-red-light)";
              e.currentTarget.style.color = "var(--portal-red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--portal-text-muted)";
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  // ── Render: Drop Zone ────────────────────────────────────────────────

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleZoneClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "32px 24px",
          borderRadius: "var(--portal-radius)",
          border: `2px dashed ${
            dragOver ? "var(--portal-accent)" : "var(--portal-border)"
          }`,
          background: dragOver
            ? "var(--portal-accent-light)"
            : "var(--portal-warm)",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "border-color 0.15s ease, background 0.15s ease",
          outline: "none",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: dragOver
              ? "var(--portal-accent)"
              : "var(--portal-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s ease",
          }}
        >
          <Upload
            size={22}
            color={dragOver ? "#fff" : "var(--portal-text-muted)"}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: dragOver
                ? "var(--portal-accent)"
                : "var(--portal-text)",
              marginBottom: 4,
            }}
          >
            {dragOver
              ? "Drop file here"
              : "Drag and drop a file, or click to browse"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--portal-text-muted)",
            }}
          >
            {accept
              ? `Accepted: ${accept}`
              : "Any file type"}
            {" · "}Max {maxSizeMB} MB
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 8,
            fontSize: 13,
            color: "var(--portal-red)",
          }}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

"use client"

import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import Link from "next/link"

interface SocialLinks {
  facebook?: string
  twitter?: string
  instagram?: string
  linkedin?: string
}

interface PortalFooterProps {
  businessName: string
  socialLinks?: SocialLinks
  privacyPolicyUrl?: string
  termsOfServiceUrl?: string
  websiteUrl?: string
}

/**
 * Public portal footer component
 *
 * Features:
 * - "Powered by Ironheart" with subtle styling
 * - Links: Privacy Policy, Terms of Service (if tenant has them)
 * - Copyright year + business name
 * - Social media icons (if tenant provides)
 * - Simple, minimal design
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <PortalFooter
 *   businessName="Acme Bookings"
 *   socialLinks={{
 *     facebook: "https://facebook.com/acme",
 *     instagram: "https://instagram.com/acme",
 *   }}
 *   privacyPolicyUrl="/privacy"
 *   termsOfServiceUrl="/terms"
 * />
 * ```
 */
export function PortalFooter({
  businessName,
  socialLinks,
  privacyPolicyUrl,
  termsOfServiceUrl,
  websiteUrl,
}: PortalFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Social Links */}
          {socialLinks && hasSocialLinks(socialLinks) && (
            <div className="flex justify-center space-x-4">
              {socialLinks.facebook && (
                <SocialLink
                  href={socialLinks.facebook}
                  icon={<Facebook className="h-5 w-5" />}
                  label="Facebook"
                />
              )}
              {socialLinks.twitter && (
                <SocialLink
                  href={socialLinks.twitter}
                  icon={<Twitter className="h-5 w-5" />}
                  label="Twitter"
                />
              )}
              {socialLinks.instagram && (
                <SocialLink
                  href={socialLinks.instagram}
                  icon={<Instagram className="h-5 w-5" />}
                  label="Instagram"
                />
              )}
              {socialLinks.linkedin && (
                <SocialLink
                  href={socialLinks.linkedin}
                  icon={<Linkedin className="h-5 w-5" />}
                  label="LinkedIn"
                />
              )}
            </div>
          )}

          {/* Legal Links */}
          {(privacyPolicyUrl || termsOfServiceUrl || websiteUrl) && (
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {websiteUrl && (
                <Link
                  href={websiteUrl}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website
                </Link>
              )}
              {privacyPolicyUrl && (
                <Link
                  href={privacyPolicyUrl}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              )}
              {termsOfServiceUrl && (
                <Link
                  href={termsOfServiceUrl}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              )}
            </div>
          )}

          {/* Copyright & Powered By */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} {businessName}. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Powered by{" "}
              <Link
                href="https://ironheart.app"
                className="hover:text-muted-foreground transition-colors underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ironheart
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * Minimal footer variant for mobile
 */
export function PortalFooterMobile({
  businessName,
  socialLinks,
}: Omit<PortalFooterProps, "privacyPolicyUrl" | "termsOfServiceUrl" | "websiteUrl">) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* Social Links */}
          {socialLinks && hasSocialLinks(socialLinks) && (
            <div className="flex justify-center space-x-3">
              {socialLinks.facebook && (
                <SocialLink
                  href={socialLinks.facebook}
                  icon={<Facebook className="h-4 w-4" />}
                  label="Facebook"
                />
              )}
              {socialLinks.twitter && (
                <SocialLink
                  href={socialLinks.twitter}
                  icon={<Twitter className="h-4 w-4" />}
                  label="Twitter"
                />
              )}
              {socialLinks.instagram && (
                <SocialLink
                  href={socialLinks.instagram}
                  icon={<Instagram className="h-4 w-4" />}
                  label="Instagram"
                />
              )}
              {socialLinks.linkedin && (
                <SocialLink
                  href={socialLinks.linkedin}
                  icon={<Linkedin className="h-4 w-4" />}
                  label="LinkedIn"
                />
              )}
            </div>
          )}

          {/* Copyright & Powered By */}
          <div className="flex flex-col items-center space-y-1 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {currentYear} {businessName}
            </p>
            <p className="text-xs text-muted-foreground/50">
              Powered by{" "}
              <Link
                href="https://ironheart.app"
                className="hover:text-muted-foreground/70 transition-colors underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ironheart
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * Social link component
 */
function SocialLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
    >
      {icon}
    </Link>
  )
}

/**
 * Check if any social links are provided
 */
function hasSocialLinks(links: SocialLinks): boolean {
  return !!(links.facebook || links.twitter || links.instagram || links.linkedin)
}

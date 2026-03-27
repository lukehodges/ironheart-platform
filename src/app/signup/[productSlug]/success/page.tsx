import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">
          You&apos;re all set!
        </h1>
        <p className="text-gray-600">
          Your account is being set up. You&apos;ll receive an email shortly with your login details.
        </p>
        <Link
          href="/sign-in"
          className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}

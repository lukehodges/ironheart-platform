export default function AccountNotFoundPage() {
  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1>Account Not Found</h1>
      <p>
        Your identity was verified, but no account was found for your email
        address in this system.
      </p>
      <p>
        This can happen if your account was recently set up. Please contact your
        administrator for assistance.
      </p>
      <p>
        <a href="/sign-in">Return to sign in</a>
      </p>
    </main>
  );
}

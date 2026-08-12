"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#fff" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#dc2626" }}>
          Error de aplicación
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#555" }}>{error.message}</p>
        {error.digest && (
          <p style={{ marginTop: "0.25rem", color: "#888", fontSize: "0.8rem" }}>
            Digest: {error.digest}
          </p>
        )}
        {error.stack && (
          <pre style={{ marginTop: "1rem", padding: "1rem", background: "#f5f5f5", borderRadius: "0.5rem", overflow: "auto", fontSize: "0.75rem", maxHeight: "400px" }}>
            {error.stack}
          </pre>
        )}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}

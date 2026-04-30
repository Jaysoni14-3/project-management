import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-xl relative overflow-hidden">
      {/* Subtle accent glow in the background — premium without shouting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full
          bg-accent-50 blur-3xl opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(6,29,111,0.06),transparent_40%)]"
      />

      <div className="relative z-base w-full flex justify-center">
        <Outlet />
      </div>

      {/* Footnote */}
      <p className="absolute bottom-lg left-1/2 -translate-x-1/2 text-caption text-fg-subtle">
        © {new Date().getFullYear()} EKAIO · Work, simplified.
      </p>
    </div>
  );
}

import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-xl relative overflow-hidden">
      {/* Subtle accent glow — light-mode only. The accent-50 tint reads as
          a near-white blob on dark surfaces; in dark mode body already
          carries its own ambient gradients (defined in index.css), so we
          step out of the way and let those breathe. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full
          bg-accent-50 blur-3xl opacity-60 dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(6,29,111,0.06),transparent_40%)] dark:hidden"
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

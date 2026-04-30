import React from "react";
import { Check } from "lucide-react";

const PHASES = [
  { key: "pitch", label: "Pitch" },
  { key: "design", label: "Design" },
  { key: "development", label: "Dev" },
  { key: "seo", label: "SEO" },
];

const ProjectPhaseBar = ({ currentPhase }) => {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <div className="flex flex-col gap-xs">
      <p className="text-eyebrow uppercase text-fg-subtle">Phase</p>

      <div className="relative flex items-start justify-between pt-sm">
        {/* Connector track */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-[14px] h-[2px] bg-line"
        />
        {/* Connector progress */}
        <div
          aria-hidden
          className="absolute left-0 top-[14px] h-[2px] bg-accent transition-[width] duration-slower"
          style={{
            width:
              currentIndex < 0
                ? "0%"
                : `${(currentIndex / (PHASES.length - 1)) * 100}%`,
          }}
        />

        {PHASES.map((phase, index) => {
          const completed = index < currentIndex;
          const active = index === currentIndex;
          const pending = !completed && !active;

          return (
            <div
              key={phase.key}
              className="relative z-base flex flex-col items-center gap-xs"
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center transition-[background-color,border-color,box-shadow] duration-fast
                  ${completed ? "bg-accent border-2 border-accent text-white" : ""}
                  ${active ? "bg-accent border-2 border-accent text-white shadow-[0_0_0_4px_rgba(6,29,111,0.12)]" : ""}
                  ${pending ? "bg-surface border-2 border-line" : ""}`}
              >
                {completed && <Check className="h-3 w-3" strokeWidth={3} />}
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <span
                className={`text-caption font-medium
                  ${active ? "text-fg" : completed ? "text-fg-muted" : "text-fg-subtle"}`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectPhaseBar;

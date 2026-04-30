const PHASES = [
    { key: "pitch", label: "Pitch" },
    { key: "design", label: "Design" },
    { key: "development", label: "Dev" },
    { key: "seo", label: "SEO" },
]

const ProjectPhaseBar = ({ currentPhase }) => {
    const currentIndex = PHASES.findIndex(
        phase => phase.key === currentPhase
    )

    return (
        <div className="flex flex-col">
            <p className="text-sm text-gray-400 mt-sm mb-xs">Phase</p>
            <div className="flex items-center justify-between">
                {PHASES.map((phase, index) => {
                    const isCompleted = index < currentIndex
                    const isActive = index === currentIndex

                    return (
                        <div key={phase.key} className={`flex items-center gap-2 border rounded-md p-xs 
                            ${isCompleted ? "bg-green-200" : "bg-gray-50"}
                            ${isActive ? "bg-blue-200" : ""}
                        `}>
                            {/* Dot */}
                            <div className={`w-3 h-3 rounded-full ${isCompleted ? "bg-green-500" : isActive ? "bg-blue-500" : "bg-gray-300"}`} />

                            {/* Label */}
                            <span className={`text-xs ${isActive ? "font-medium text-gray-900" : "text-gray-500"}`} >
                                {phase.label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default ProjectPhaseBar

import React, { useEffect, useState } from 'react'

const gradientMap = {
    success: {
      strip: "from-emerald-500 to-emerald-300",
    },
    primary: {
      strip: "from-[rgb(37_99_235)] to-[rgba(37,99,235,0.4)]",
    },
    neutral: {
      strip: "from-gray-400 to-gray-300",
    },
    danger: {
        strip: "from-red-400 to-red-300",
    },
    
  };

const StatCard = ({ label, value, icon: Icon, variant = "neutral" }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 800; // ms
        const increment = value / (duration / 16);

        const counter = setInterval(() => {
            start += increment;
            if (start >= value) {
                setDisplayValue(value);
                clearInterval(counter);
            } else {
                setDisplayValue(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(counter);
    }, [value]);

    const gradients = gradientMap[variant];

    return (
        <div className="relative bg-white flex align-baseline justify-start gap-lg border border-border rounded-md p-lg py-7 shadow-card transition-all duration-300 ease-out hover:shadow-lg overflow-hidden">
            <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${gradients.strip}`}/>
            {Icon && (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-text-secondary text-xl">
                    <Icon />
                </div>
            )}

            {/* Text */}
            <div>
                <p className="text-sm text-text-secondary">{label}</p>
                <h3 className="text-3xl font-semibold text-text-primary leading-tight">
                    {displayValue}
                </h3>
            </div>
        </div>
    )
}

export default StatCard
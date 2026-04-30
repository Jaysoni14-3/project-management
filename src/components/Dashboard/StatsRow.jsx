import React from 'react'
import StatCard from './StatCard'

import {
    FiCheckCircle,
    FiUsers,
    FiTrendingUp,
    FiAlertTriangle,
  } from "react-icons/fi";

const StatsRow = ({
    employeeCount,
    activeProjectCount,
    completedProjectCount,
    statsLoading,
    bugs,
}) => {
    if(statsLoading){
        return(
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg mb-lg">
            {[...Array(4)].map((_, i) => (
                <div
                key={i}
                className="h-24 bg-muted rounded-md animate-pulse"
                />
            ))}
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg mb-lg">
            <StatCard
                label="Completed Projects"
                value={completedProjectCount}
                icon={FiCheckCircle}
                variant="success"
            />
            <StatCard
                label="Active Projects"
                value={activeProjectCount}
                icon={FiTrendingUp}
                variant="primary"
            />
            <StatCard
                label="Employees"
                value={employeeCount}
                icon={FiUsers}
                variant="neutral"
            />
            <StatCard
                label="Bugs"
                value={bugs}
                icon={FiAlertTriangle}
                variant="danger"
            />
        </div>
    )
}

export default StatsRow
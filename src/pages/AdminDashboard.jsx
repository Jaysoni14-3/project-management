import React from 'react'
import StatsRow from '../components/Dashboard/StatsRow';
import useDashboardStats from '../hooks/useDashboardStats';


const AdminDashboard = () => {

  const overviewCardsData = [
    { cardTitle: "Total Projects", cardValue: 21, cardIcon: 'Total-projects.png' },
    { cardTitle: "Active Projects", cardValue: 16, cardIcon: 'Active-projects.png' },
    { cardTitle: "Team Members", cardValue: 25, cardIcon: 'Team-members.png' },
    { cardTitle: "Completion Rate", cardValue: 77, cardIcon: 'Completion-rate.png' },
    { cardTitle: <>Total <br /> Bugs</>, cardValue: 47, cardIcon: 'Total-bugs.png' },
    { cardTitle: "Milestones Hit", cardValue: '70/90', cardIcon: 'Milestones-hit.png' },
    { cardTitle: "Meetings this week", cardValue: 17, cardIcon: 'Meetings-this-week.png' },
    { cardTitle: "Tasks Completed", cardValue: 350, cardIcon: 'Tasks-completed.png' },
  ]

  const {
    employeeCount,
    activeProjectCount,
    completedProjectCount,
    statsLoading,
    bugs,
  } = useDashboardStats();

  return (
    <>
      {/* Quick stats */}
      <div>
        <StatsRow
          employeeCount={employeeCount}
          activeProjectCount={activeProjectCount}
          completedProjectCount={completedProjectCount}
          statsLoading={statsLoading}
          bugs={bugs}
        />
      </div>

      {/* Full width banner */}
      <div className="banner-section border py-8 px-8 rounded-3xl bg-accent-gradient">
        <div className="banner-content">
          <h2 className="text-white text-page font-medium">Hello Rushabh !</h2>
          <p className="text-white text-body mt-2">Welcome back, Here’s a comprehensive view of all projects and metrics.</p>
        </div>
      </div>

      {/* Overview Cards Data  */}
      <div className="overview-cards-section grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg mt-4">
      {overviewCardsData.map((card) => {
        const Icon = card.cardIcon;

        return (
          <div
            key={card.cardTitle}
            className="overview-card flex items-start justify-between border border-[#EDEDED] rounded-[30px] py-9 px-5"
          >
            <div className="overview-card-text w-1/2">
              <h2 className="text-lg leading-6 font-medium text-gray-600">
                {card.cardTitle}
              </h2>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {card.cardValue}
              </p>
            </div>

            <div className="overview-card-icon rounded-full ">
              <img
                src={`/images/${card.cardIcon}`}
                alt={card.cardTitle}
                className="w-14 h-14"
              />
            </div>
          </div>
        );
      })}
      </div>

    </>
  )
}

export default AdminDashboard
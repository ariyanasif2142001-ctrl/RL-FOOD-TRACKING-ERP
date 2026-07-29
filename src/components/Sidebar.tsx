import React from 'react';
import { LiveNotificationsWidget, UsersOnlineWidget, RecentActivityWidget, UpcomingTasksWidget } from './Widgets';

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-full lg:w-80 space-y-6 flex-shrink-0">
      {/* Live Notifications Widget */}
      <LiveNotificationsWidget />

      {/* Users Online Widget */}
      <UsersOnlineWidget />

      {/* Recent Activity Feed */}
      <RecentActivityWidget />

      {/* Upcoming Tasks */}
      <UpcomingTasksWidget />
    </aside>
  );
};

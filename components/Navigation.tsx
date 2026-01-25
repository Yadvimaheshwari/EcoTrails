
import React from 'react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  // Map current view to tab (for nested views)
  const getActiveTab = (view: AppView): AppView => {
    if ([AppView.EXPLORE, AppView.PARK_SELECTION, AppView.TRAIL_DETAIL, AppView.PARK_DETAIL, AppView.SAVED_TRAILS].includes(view)) {
      return AppView.EXPLORE;
    }
    if (view === AppView.MAP) {
      return AppView.MAP;
    }
    if ([AppView.RECORD_HIKE, AppView.ACTIVE_HIKE].includes(view)) {
      return AppView.RECORD_HIKE;
    }
    if ([AppView.ACTIVITY, AppView.HIKEDETAIL, AppView.POST_HIKE_INSIGHTS, AppView.REPLAY_3D, AppView.STATISTICS, AppView.JOURNAL, AppView.REPORT].includes(view)) {
      return AppView.ACTIVITY;
    }
    if ([AppView.PROFILE, AppView.SETTINGS, AppView.WEARABLE_DEVICES, AppView.ECODROID_DEVICES, AppView.ABOUT, AppView.ACCOUNT].includes(view)) {
      return AppView.PROFILE;
    }
    // Legacy mappings
    if (view === AppView.DASHBOARD || view === AppView.TERRAIN) {
      return AppView.EXPLORE;
    }
    if (view === AppView.STUDIO) {
      return AppView.EXPLORE;
    }
    return AppView.EXPLORE; // Default
  };

  const activeTab = getActiveTab(currentView);

  const items = [
    { 
      id: AppView.EXPLORE, 
      label: 'Explore', 
      icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' 
    },
    { 
      id: AppView.MAP, 
      label: 'Map', 
      icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' 
    },
    { 
      id: AppView.RECORD_HIKE, 
      label: 'Record', 
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' 
    },
    { 
      id: AppView.ACTIVITY, 
      label: 'Activity', 
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' 
    },
    { 
      id: AppView.PROFILE, 
      label: 'Profile', 
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' 
    }
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
      <nav className="bg-white/90 backdrop-blur-xl border border-[#E2E8DE] rounded-[32px] p-1.5 flex items-center justify-between shadow-[0_8px_32px_rgba(45,71,57,0.08)]">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center py-2.5 px-0.5 rounded-[24px] transition-all duration-500 ${
                isActive 
                  ? 'bg-[#2D4739] text-white shadow-md' 
                  : 'text-[#8E8B82] hover:text-[#2D4739] hover:bg-[#F9F9F7]'
              }`}
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Navigation;

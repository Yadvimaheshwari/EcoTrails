
import './aistudio-mock';
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import { AppView, EnvironmentalRecord, MediaPacket, TrailBriefing } from './types';
import Dashboard from './views/Dashboard';
import MemoryView from './views/MemoryView';
import ExplorationView from './views/ExplorationView';
import VeoGenView from './views/VeoGenView';
import ReportView from './views/ReportView';
import OnboardingView from './views/OnboardingView';
import ParkSelectionView from './views/ParkSelectionView';
import BriefingView from './views/BriefingView';
import MediaIngestionView from './views/MediaIngestionView';
import AnalysisView from './views/AnalysisView';
import AccountView from './views/AccountView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.EXPLORE);
  const [selectedRecord, setSelectedRecord] = useState<EnvironmentalRecord | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [records, setRecords] = useState<EnvironmentalRecord[]>([]);
  
  const [activeBriefing, setActiveBriefing] = useState<TrailBriefing | null>(null);
  const [sessionPacket, setSessionPacket] = useState<MediaPacket | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        if (window.aistudio) {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(selected);
        } else {
          // Fallback: check environment variable or localStorage
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
          setHasApiKey(!!apiKey);
        }
      } catch (error) {
        console.error('Error checking API key:', error);
        // Fallback: check environment variable or localStorage
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
        setHasApiKey(!!apiKey);
      }
    };
    checkApiKey();

    const onboardingDone = localStorage.getItem('atlas_onboarding_done_v2');
    if (onboardingDone) setShowOnboarding(false);

    const saved = localStorage.getItem('atlas_records_v2');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved records:", e);
      }
    }
  }, []);

  const handleSelectKey = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
      } else {
        // Fallback: prompt for API key
        const key = prompt('Enter your Gemini API Key:');
        if (key) {
          localStorage.setItem('gemini_api_key', key);
          setHasApiKey(true);
        }
      }
    } catch (error) {
      console.error('Error selecting API key:', error);
      // Fallback: prompt for API key
      const key = prompt('Enter your Gemini API Key:');
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        setHasApiKey(true);
      }
    }
  };

  const onAnalysisComplete = (newRecord: EnvironmentalRecord) => {
    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem('atlas_records_v2', JSON.stringify(updated));
    setSelectedRecord(newRecord);
    setCurrentView(AppView.REPORT);
    setActiveBriefing(null);
    setSessionPacket(null);
  };

  const navigateToReport = (record: EnvironmentalRecord) => {
    setSelectedRecord(record);
    setCurrentView(AppView.REPORT);
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8">
          <div className="w-24 h-24 rounded-[32px] bg-[#2D4739] flex items-center justify-center shadow-2xl mx-auto mb-6 transform hover:rotate-6 transition-transform">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-display text-[#2D4739]">Preparing to listen to the world</h1>
          <p className="text-body text-[#8E8B82]">A secure connection is required to begin understanding these landscapes.</p>
          <button onClick={handleSelectKey} className="w-full py-5 bg-[#2D4739] text-white font-bold rounded-[20px] shadow-xl hover:bg-[#1A2C23] transition-all">Begin the conversation</button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="block text-xs text-blue-600 underline font-medium tracking-tight">Information about system requirements</a>
        </div>
      </div>
    );
  }

  if (showOnboarding) return <OnboardingView onComplete={() => {
    localStorage.setItem('atlas_onboarding_done_v2', 'true');
    setShowOnboarding(false);
  }} />;

  const renderView = () => {
    // Main Tab Views
    switch (currentView) {
      // Explore Tab
      case AppView.EXPLORE:
      case AppView.PARK_SELECTION:
        return <ParkSelectionView onBriefingReady={(b) => { setActiveBriefing(b); setCurrentView(AppView.PARK_DETAIL); }} />;
      case AppView.PARK_DETAIL:
        return activeBriefing ? <BriefingView briefing={activeBriefing} onStart={() => setCurrentView(AppView.RECORD_HIKE)} /> : <ParkSelectionView onBriefingReady={setActiveBriefing} />;
      case AppView.TRAIL_DETAIL:
        // TODO: Implement TrailDetailView
        return <ParkSelectionView onBriefingReady={setActiveBriefing} />;
      case AppView.SAVED_TRAILS:
        // TODO: Implement SavedTrailsView
        return <ParkSelectionView onBriefingReady={setActiveBriefing} />;
      
      // Map Tab
      case AppView.MAP:
        // TODO: Implement MapView
        return <ExplorationView />;
      
      // Record Hike Tab
      case AppView.RECORD_HIKE:
        // TODO: Implement RecordHikeView (no auto-start)
        return <Dashboard activePark={activeBriefing?.park_name || null} onStart={() => setCurrentView(AppView.PARK_SELECTION)} onEnd={() => setCurrentView(AppView.INGESTION)} />;
      case AppView.ACTIVE_HIKE:
        return <Dashboard activePark={activeBriefing?.park_name || null} onStart={() => setCurrentView(AppView.PARK_SELECTION)} onEnd={() => setCurrentView(AppView.INGESTION)} />;
      
      // Activity Tab
      case AppView.ACTIVITY:
      case AppView.JOURNAL:
        return <MemoryView records={records} onOpenReport={navigateToReport} />;
      case AppView.HIKEDETAIL:
        return selectedRecord ? <ReportView record={selectedRecord} onBack={() => { setSelectedRecord(null); setCurrentView(AppView.ACTIVITY); }} /> : <MemoryView records={records} onOpenReport={navigateToReport} />;
      case AppView.POST_HIKE_INSIGHTS:
        return selectedRecord ? <ReportView record={selectedRecord} onBack={() => { setSelectedRecord(null); setCurrentView(AppView.ACTIVITY); }} /> : <MemoryView records={records} onOpenReport={navigateToReport} />;
      case AppView.REPLAY_3D:
        // TODO: Implement Replay3DView
        return <MemoryView records={records} onOpenReport={navigateToReport} />;
      case AppView.STATISTICS:
        // TODO: Implement StatisticsView
        return <MemoryView records={records} onOpenReport={navigateToReport} />;
      case AppView.REPORT:
        return selectedRecord ? <ReportView record={selectedRecord} onBack={() => { setSelectedRecord(null); setCurrentView(AppView.ACTIVITY); }} /> : <MemoryView records={records} onOpenReport={navigateToReport} />;
      
      // Profile Tab
      case AppView.PROFILE:
      case AppView.ACCOUNT:
        return <AccountView onLogout={() => { localStorage.clear(); window.location.reload(); }} />;
      case AppView.SETTINGS:
        // TODO: Implement SettingsView
        return <AccountView onLogout={() => { localStorage.clear(); window.location.reload(); }} />;
      case AppView.WEARABLE_DEVICES:
        // TODO: Implement WearableDevicesView
        return <AccountView onLogout={() => { localStorage.clear(); window.location.reload(); }} />;
      case AppView.ECODROID_DEVICES:
        // TODO: Implement EcoDroidDevicesView
        return <AccountView onLogout={() => { localStorage.clear(); window.location.reload(); }} />;
      case AppView.ABOUT:
        // TODO: Implement AboutView
        return <AccountView onLogout={() => { localStorage.clear(); window.location.reload(); }} />;
      
      // Legacy/Modal Views
      case AppView.DASHBOARD:
        return <Dashboard activePark={activeBriefing?.park_name || null} onStart={() => setCurrentView(AppView.EXPLORE)} onEnd={() => setCurrentView(AppView.INGESTION)} />;
      case AppView.TERRAIN:
        return <ExplorationView />;
      case AppView.STUDIO:
        return <VeoGenView />;
      case AppView.INGESTION:
        return <MediaIngestionView onComplete={(p) => { setSessionPacket(p); setCurrentView(AppView.ANALYSIS); }} onCancel={() => setCurrentView(AppView.EXPLORE)} />;
      case AppView.ANALYSIS:
        return sessionPacket && activeBriefing ? <AnalysisView packet={sessionPacket} parkName={activeBriefing.park_name} records={records} onComplete={onAnalysisComplete} /> : <ParkSelectionView onBriefingReady={setActiveBriefing} />;
      case AppView.BRIEFING:
        return activeBriefing ? <BriefingView briefing={activeBriefing} onStart={() => setCurrentView(AppView.RECORD_HIKE)} /> : <ParkSelectionView onBriefingReady={setActiveBriefing} />;
      
      default:
        return <ParkSelectionView onBriefingReady={setActiveBriefing} />;
    }
  };

  // Show navigation for main tabs, hide for modals and onboarding
  const showNav = ![
    AppView.ONBOARDING,
    AppView.INGESTION,
    AppView.ANALYSIS,
    AppView.ACTIVE_HIKE,
    AppView.BRIEFING,
  ].includes(currentView);

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col">
      <main className={`flex-1 ${(currentView === AppView.REPORT && selectedRecord) || currentView === AppView.ONBOARDING ? "" : "px-6"}`}>
        {renderView()}
      </main>
      {showNav && <Navigation currentView={currentView} setView={setCurrentView} />}
    </div>
  );
};

export default App;

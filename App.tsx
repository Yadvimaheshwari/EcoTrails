
import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import { AppView, EnvironmentalRecord } from './types';
import Dashboard from './views/Dashboard';
import MemoryView from './views/MemoryView';
import ExplorationView from './views/ExplorationView';
import VeoGenView from './views/VeoGenView';
import ReportView from './views/ReportView';
import OnboardingView from './views/OnboardingView';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedRecord, setSelectedRecord] = useState<EnvironmentalRecord | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [records, setRecords] = useState<EnvironmentalRecord[]>([]);

  useEffect(() => {
    const checkApiKey = async () => {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkApiKey();

    const visited = localStorage.getItem('atlas_visited');
    if (visited) setShowOnboarding(false);
  }, []);

  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const completeOnboarding = () => {
    localStorage.setItem('atlas_visited', 'true');
    setShowOnboarding(false);
  };

  const handleOpenReport = (record: EnvironmentalRecord) => {
    setSelectedRecord(record);
    setCurrentView(AppView.REPORT);
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8 animate-in fade-in duration-700">
          <div className="w-20 h-20 rounded-3xl bg-[#2D4739] flex items-center justify-center shadow-xl mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#2D4739] font-['Instrument_Sans'] tracking-tight">EcoAtlas Activation</h1>
          <p className="text-gray-600 leading-relaxed">
            To enable deep environmental sensing and cinematic synthesis, please select a valid API key from a paid GCP project.
          </p>
          <div className="space-y-4 pt-4">
            <button 
              onClick={handleSelectKey}
              className="w-full py-4 bg-[#2D4739] text-white font-bold rounded-2xl hover:bg-[#1A2C23] transition-all shadow-lg active:scale-[0.98]"
            >
              Select Paid API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-xs text-[#2D4739] hover:underline font-medium"
            >
              View Billing Documentation
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingView onComplete={completeOnboarding} />;
  }

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <Dashboard records={records} />;
      case AppView.JOURNAL: return <MemoryView records={records} onOpenReport={handleOpenReport} />;
      case AppView.TERRAIN: return <ExplorationView />;
      case AppView.STUDIO: return <VeoGenView />;
      case AppView.REPORT: return selectedRecord ? <ReportView record={selectedRecord} onBack={() => setCurrentView(AppView.JOURNAL)} /> : <MemoryView records={records} onOpenReport={handleOpenReport} />;
      default: return <Dashboard records={records} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {currentView !== AppView.REPORT && (
        <header className="px-6 pt-12 pb-6 max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D4739] flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#2D4739] tracking-tight font-['Instrument_Sans']">Atlas</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-[#E2E8DE] flex items-center justify-center shadow-sm overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
          </button>
        </header>
      )}

      <main className={currentView === AppView.REPORT ? "" : "px-6"}>
        {renderView()}
      </main>

      {currentView !== AppView.REPORT && (
        <Navigation currentView={currentView} setView={setCurrentView} />
      )}
    </div>
  );
};

export default App;

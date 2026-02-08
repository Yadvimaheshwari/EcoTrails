'use client';

type JournalMode = 'plan' | 'log' | 'discoveries' | 'achievements';

interface JournalModeSwitchProps {
  currentMode: JournalMode;
  onChange: (mode: JournalMode) => void;
}

export function JournalModeSwitch({ currentMode, onChange }: JournalModeSwitchProps) {
  const modes: { value: JournalMode; label: string; icon: string }[] = [
    { value: 'plan', label: 'Plan', icon: '📋' },
    { value: 'log', label: 'Hike Log', icon: '🥾' },
    { value: 'discoveries', label: 'Discoveries', icon: '🔍' },
    { value: 'achievements', label: 'Achievements', icon: '🏆' },
  ];

  return (
    <div className="flex gap-2 p-1 rounded-2xl" style={{ backgroundColor: 'rgba(79, 138, 107, 0.1)' }}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className="flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all min-w-[100px]"
          style={{
            backgroundColor: currentMode === mode.value ? '#4F8A6B' : 'transparent',
            color: currentMode === mode.value ? '#FFFFFF' : '#1B1F1E',
          }}
        >
          <span className="mr-2">{mode.icon}</span>
          {mode.label}
        </button>
      ))}
    </div>
  );
}

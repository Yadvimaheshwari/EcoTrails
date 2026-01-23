
import React, { useState } from 'react';

interface OnboardingViewProps {
  onComplete: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Welcome to Atlas",
      description: "Every trail has a story; we're here to help you read it. Together, we'll build a living journal of the natural world.",
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=800",
      cta: "Step into the wild"
    },
    {
      title: "A Sense of Place",
      description: "Your phone is now a field instrument. It listens to the wind, feels the elevation, and remembers the colors of the forest.",
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800",
      cta: "Learn to listen"
    },
    {
      title: "The Living Synthesis",
      description: "After every journey, Atlas weaves your footprints into a digital field guide, tracking how the landscape shifts over time.",
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=800",
      cta: "Start walking"
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div className="max-w-md w-full space-y-12 transition-all duration-700">
        <div className="relative aspect-square w-full rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in duration-1000">
          <img src={slides[step].image} className="w-full h-full object-cover transition-transform duration-[2000ms] scale-110" alt="Nature" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2D4739]/40 to-transparent"></div>
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-display text-[#2D4739] font-['Instrument_Sans']">{slides[step].title}</h1>
          <p className="text-body text-[#4A443F] leading-relaxed max-w-sm mx-auto opacity-80">
            {slides[step].description}
          </p>
        </div>

        <div className="space-y-8 pt-4">
          <button 
            onClick={handleNext}
            className="w-full py-5 btn-pine text-h2 shadow-xl shadow-emerald-900/10"
          >
            {slides[step].cta}
          </button>
          
          <div className="flex justify-center space-x-2">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-[#2D4739]' : 'w-2 bg-[#E2E8DE]'}`} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;

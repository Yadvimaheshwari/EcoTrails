'use client';

import { useState, useRef } from 'react';
import { identifyImage, identifyAudio, suggestNextAction, getTrailVegetation } from '@/lib/api';
import { Chip } from './ui/Chip';
import { LoadingState } from './ui/LoadingState';
import { InfoSection, InfoTooltip } from './InfoTooltip';

interface CompanionPanelProps {
  trailId?: string;
  trailName?: string;
  currentLocation?: { lat: number; lng: number };
  trailProgress?: number;
}

export function CompanionPanel({
  trailId,
  trailName,
  currentLocation,
  trailProgress = 0
}: CompanionPanelProps) {
  const [identifying, setIdentifying] = useState(false);
  const [identification, setIdentification] = useState<any>(null);
  const [vegetationInfo, setVegetationInfo] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [loadingVegetation, setLoadingVegetation] = useState(false);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdentifying(true);
    try {
      const response = await identifyImage(file, currentLocation, trailName);
      if (response.data.success) {
        setIdentification(response.data.identification);
      }
    } catch (error: any) {
      console.error('Failed to identify image:', error);
      alert(error.response?.data?.detail || 'Failed to identify image');
    } finally {
      setIdentifying(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAudioCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdentifying(true);
    try {
      const response = await identifyAudio(file, currentLocation, trailName);
      if (response.data.success) {
        setIdentification(response.data.identification);
      }
    } catch (error: any) {
      console.error('Failed to identify audio:', error);
      alert(error.response?.data?.detail || 'Failed to identify audio');
    } finally {
      setIdentifying(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const loadVegetationInfo = async () => {
    if (!trailId) return;
    
    setLoadingVegetation(true);
    try {
      const response = await getTrailVegetation(trailId);
      if (response.data.success) {
        setVegetationInfo(response.data.vegetation_info);
      }
    } catch (error: any) {
      console.error('Failed to load vegetation info:', error);
    } finally {
      setLoadingVegetation(false);
    }
  };

  const loadSuggestion = async () => {
    if (!currentLocation) return;
    
    setLoadingSuggestion(true);
    try {
      const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                       new Date().getHours() < 17 ? 'afternoon' : 'evening';
      
      const response = await suggestNextAction(
        currentLocation,
        trailProgress,
        timeOfDay,
        trailName
      );
      if (response.data.success) {
        setSuggestion(response.data.suggestion);
      }
    } catch (error: any) {
      console.error('Failed to get suggestion:', error);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Section */}
      <InfoSection
        icon="🤖"
        title="About Hiking Companion"
        content="EcoTrails Companion is your AI-powered hiking assistant. Use the camera to identify plants, wildlife, and geological features you encounter. Use the microphone to identify bird calls and animal sounds. Get vegetation information to know what you'll see on the trail. Get AI-powered suggestions for the next best action to make your hike more informative and memorable. All identifications include detailed information, ecological context, interesting facts, and safety notes."
      />
      
      {/* Action Buttons */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-semibold">Hiking Companion</h3>
          <InfoTooltip
            title="How to Use Companion"
            content="Click 'Identify from Photo' to take or upload a photo - the AI will identify what you're seeing and provide detailed information. Click 'Identify Sound' to record audio - the AI will identify bird calls and animal sounds. Click 'View Vegetation Info' to see what plants and wildlife you'll encounter on this trail. Click 'Get Suggestion' for AI-powered recommendations on what to do next."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
              id="image-capture"
            />
            <label
              htmlFor="image-capture"
              className="block w-full px-6 py-4 bg-pineGreen text-fogWhite rounded-lg font-semibold text-center hover:bg-pineGreen/90 transition-colors cursor-pointer"
            >
              📷 Identify from Photo
            </label>
          </div>
          <div className="flex-1">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              capture
              onChange={handleAudioCapture}
              className="hidden"
              id="audio-capture"
            />
            <label
              htmlFor="audio-capture"
              className="block w-full px-6 py-4 bg-skyAccent text-fogWhite rounded-lg font-semibold text-center hover:bg-skyAccent/90 transition-colors cursor-pointer"
            >
              🎤 Identify Sound
            </label>
          </div>
        </div>
        
        {trailId && (
          <div className="mt-4 flex gap-4">
            <button
              onClick={loadVegetationInfo}
              disabled={loadingVegetation}
              className="flex-1 px-4 py-2 bg-stoneGray text-text rounded-lg hover:bg-stoneGray/80 transition-colors disabled:opacity-50"
            >
              {loadingVegetation ? 'Loading...' : '🌲 View Vegetation Info'}
            </button>
            {currentLocation && (
              <button
                onClick={loadSuggestion}
                disabled={loadingSuggestion}
                className="flex-1 px-4 py-2 bg-stoneGray text-text rounded-lg hover:bg-stoneGray/80 transition-colors disabled:opacity-50"
              >
                {loadingSuggestion ? 'Loading...' : '💡 Get Suggestion'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Identification Result */}
      {identifying && (
        <div className="card p-6">
          <LoadingState message="Identifying..." />
        </div>
      )}

      {identification && !identifying && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">Identification Result</h3>
          
          {identification.primary_subject && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {identification.primary_subject.type === 'plant' ? '🌿' :
                   identification.primary_subject.type === 'animal' ? '🦌' :
                   identification.primary_subject.type === 'geological' ? '⛰️' :
                   identification.primary_subject.type === 'landscape' ? '🏞️' : '🔍'}
                </span>
                <div>
                  <div className="font-semibold text-lg">
                    {identification.primary_subject.common_name}
                  </div>
                  {identification.primary_subject.scientific_name && (
                    <div className="text-sm text-textSecondary italic">
                      {identification.primary_subject.scientific_name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {identification.description && (
            <p className="text-textSecondary mb-4">{identification.description}</p>
          )}

          {identification.ecological_context && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Ecological Context</h4>
              <div className="text-sm text-textSecondary space-y-1">
                <div>Habitat: {identification.ecological_context.habitat}</div>
                <div>Ecosystem Role: {identification.ecological_context.ecosystem_role}</div>
                {identification.ecological_context.seasonal_info && (
                  <div>Seasonal: {identification.ecological_context.seasonal_info}</div>
                )}
              </div>
            </div>
          )}

          {identification.interesting_facts && identification.interesting_facts.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Interesting Facts</h4>
              <ul className="space-y-1">
                {identification.interesting_facts.map((fact: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary">• {fact}</li>
                ))}
              </ul>
            </div>
          )}

          {identification.safety_notes && identification.safety_notes.length > 0 && (
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Safety Notes</h4>
              <ul className="space-y-1">
                {identification.safety_notes.map((note: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary">⚠️ {note}</li>
                ))}
              </ul>
            </div>
          )}

          {identification.photography_tips && identification.photography_tips.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Photography Tips</h4>
              <ul className="space-y-1">
                {identification.photography_tips.map((tip: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary">📸 {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Vegetation Info */}
      {vegetationInfo && (
        <div className="card p-6">
          <h3 className="text-xl font-semibold mb-4">🌲 Trail Vegetation & Habitat</h3>
          
          {vegetationInfo.vegetation_zones && vegetationInfo.vegetation_zones.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Vegetation Zones</h4>
              <div className="space-y-4">
                {vegetationInfo.vegetation_zones.map((zone: any, idx: number) => (
                  <div key={idx} className="border border-stoneGray rounded-lg p-4">
                    <div className="font-semibold mb-2">{zone.zone_name}</div>
                    <div className="text-sm text-textSecondary mb-2">{zone.ecosystem_type}</div>
                    {zone.dominant_species && zone.dominant_species.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {zone.dominant_species.map((species: string, sIdx: number) => (
                          <Chip key={sIdx} label={species} variant="default" size="sm" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {vegetationInfo.wildlife && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Wildlife</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vegetationInfo.wildlife.birds && vegetationInfo.wildlife.birds.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">🦅 Birds</div>
                    <div className="space-y-1">
                      {vegetationInfo.wildlife.birds.map((bird: string, idx: number) => (
                        <div key={idx} className="text-sm text-textSecondary">• {bird}</div>
                      ))}
                    </div>
                  </div>
                )}
                {vegetationInfo.wildlife.mammals && vegetationInfo.wildlife.mammals.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">🦌 Mammals</div>
                    <div className="space-y-1">
                      {vegetationInfo.wildlife.mammals.map((mammal: string, idx: number) => (
                        <div key={idx} className="text-sm text-textSecondary">• {mammal}</div>
                      ))}
                    </div>
                  </div>
                )}
                {vegetationInfo.wildlife.other && vegetationInfo.wildlife.other.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">🐾 Other</div>
                    <div className="space-y-1">
                      {vegetationInfo.wildlife.other.map((animal: string, idx: number) => (
                        <div key={idx} className="text-sm text-textSecondary">• {animal}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {vegetationInfo.seasonal_info && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Seasonal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(vegetationInfo.seasonal_info).map(([season, info]: [string, any]) => (
                  <div key={season} className="border border-stoneGray rounded-lg p-4">
                    <div className="font-semibold mb-2 capitalize">{season}</div>
                    <div className="text-sm text-textSecondary">{info}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vegetationInfo.observation_tips && vegetationInfo.observation_tips.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Observation Tips</h4>
              <ul className="space-y-2">
                {vegetationInfo.observation_tips.map((tip: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary flex items-start gap-2">
                    <span>👁️</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div className="card p-6 border-l-4 border-pineGreen">
          <h3 className="text-xl font-semibold mb-4">💡 Suggested Next Action</h3>
          
          {suggestion.suggested_action && (
            <div className="mb-4">
              <div className="font-semibold text-lg mb-2">
                {suggestion.suggested_action.title}
              </div>
              <p className="text-textSecondary mb-2">
                {suggestion.suggested_action.description}
              </p>
              <div className="text-sm text-textSecondary space-y-1">
                <div>Reason: {suggestion.suggested_action.reason}</div>
                {suggestion.suggested_action.expected_outcome && (
                  <div>Expected: {suggestion.suggested_action.expected_outcome}</div>
                )}
                {suggestion.suggested_action.time_estimate && (
                  <div>Time: {suggestion.suggested_action.time_estimate}</div>
                )}
              </div>
            </div>
          )}

          {suggestion.nearby_opportunities && suggestion.nearby_opportunities.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Nearby Opportunities</h4>
              <div className="space-y-2">
                {suggestion.nearby_opportunities.map((opp: any, idx: number) => (
                  <div key={idx} className="border border-stoneGray rounded-lg p-3">
                    <div className="font-medium">{opp.opportunity}</div>
                    <div className="text-sm text-textSecondary">{opp.location}</div>
                    <div className="text-sm text-textSecondary mt-1">{opp.why_interesting}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestion.tips && suggestion.tips.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Tips</h4>
              <ul className="space-y-1">
                {suggestion.tips.map((tip: string, idx: number) => (
                  <li key={idx} className="text-sm text-textSecondary">• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

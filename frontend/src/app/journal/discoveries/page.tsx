'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockDiscoveries } from '@/lib/journal/mockData';
import { filterDiscoveriesByCategory } from '@/lib/journal/mockData';
import { 
  Search, Filter, Camera, Leaf, PawPrint, Mountain as MountainIcon, 
  BookOpen, ChevronLeft, MapPin, Calendar
} from 'lucide-react';

type CategoryFilter = 'all' | 'wildlife' | 'vegetation' | 'geology' | 'history';

export default function DiscoveriesArchivePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedDiscovery, setSelectedDiscovery] = useState<string | null>(null);

  const filteredDiscoveries = filterDiscoveriesByCategory(mockDiscoveries, categoryFilter);
  const searchedDiscoveries = filteredDiscoveries.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.scientificName && d.scientificName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categoryIcons: Record<CategoryFilter, any> = {
    all: Filter,
    wildlife: PawPrint,
    vegetation: Leaf,
    geology: MountainIcon,
    history: BookOpen,
  };

  const categoryColors: Record<string, string> = {
    wildlife: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    vegetation: 'bg-green-100 text-green-700 border-green-200',
    geology: 'bg-slate-100 text-slate-700 border-slate-200',
    history: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const categoryCounts = {
    all: mockDiscoveries.length,
    wildlife: mockDiscoveries.filter(d => d.category === 'wildlife').length,
    vegetation: mockDiscoveries.filter(d => d.category === 'vegetation').length,
    geology: mockDiscoveries.filter(d => d.category === 'geology').length,
    history: mockDiscoveries.filter(d => d.category === 'history').length,
  };

  const selectedDiscoveryData = selectedDiscovery
    ? mockDiscoveries.find(d => d.id === selectedDiscovery)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/journal')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Back to journal"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Discoveries Archive</h1>
              <p className="text-sm text-slate-600 mt-1">
                Your field guide • {searchedDiscoveries.length} {searchedDiscoveries.length === 1 ? 'discovery' : 'discoveries'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, species, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </header>

      {/* Category Filters */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200 sticky top-[132px] z-20">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'wildlife', 'vegetation', 'geology', 'history'] as CategoryFilter[]).map(category => {
              const Icon = categoryIcons[category];
              const isActive = categoryFilter === category;
              return (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="capitalize">{category}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    isActive ? 'bg-orange-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {categoryCounts[category]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {searchedDiscoveries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchedDiscoveries.map(discovery => {
              const CategoryIcon = categoryIcons[discovery.category as CategoryFilter] || Camera;
              return (
                <button
                  key={discovery.id}
                  onClick={() => setSelectedDiscovery(discovery.id)}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  {/* Thumbnail */}
                  {discovery.photo && (
                    <div className="aspect-video bg-slate-100 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                      <Camera className="w-8 h-8 text-slate-300" />
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${categoryColors[discovery.category]}`}>
                      <CategoryIcon className="w-3 h-3 inline mr-1" />
                      {discovery.category}
                    </span>
                    {discovery.confidence && (
                      <span className="text-xs text-slate-500">
                        {Math.round(discovery.confidence * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-orange-600 transition-colors mb-1">
                    {discovery.name}
                  </h3>

                  {/* Scientific Name */}
                  {discovery.scientificName && (
                    <p className="text-sm italic text-slate-600 mb-2">{discovery.scientificName}</p>
                  )}

                  {/* Description */}
                  <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                    {discovery.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {discovery.parkName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(discovery.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">No discoveries found</h2>
            <p className="text-slate-600 mb-6">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search term.`
                : 'Start logging discoveries on your hikes to build your field guide.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </main>

      {/* Discovery Detail Modal */}
      {selectedDiscoveryData && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDiscovery(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 rounded-t-2xl">
              <button
                onClick={() => setSelectedDiscovery(null)}
                className="absolute right-4 top-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${categoryColors[selectedDiscoveryData.category]}`}>
                  {categoryIcons[selectedDiscoveryData.category as CategoryFilter] && (
                    <>
                      {(() => {
                        const Icon = categoryIcons[selectedDiscoveryData.category as CategoryFilter];
                        return <Icon className="w-3 h-3 inline mr-1" />;
                      })()}
                    </>
                  )}
                  {selectedDiscoveryData.category}
                </span>
                {selectedDiscoveryData.confidence && (
                  <span className="text-xs text-slate-500">
                    {Math.round(selectedDiscoveryData.confidence * 100)}% confident
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{selectedDiscoveryData.name}</h2>
              {selectedDiscoveryData.scientificName && (
                <p className="text-lg italic text-slate-600 mt-1">{selectedDiscoveryData.scientificName}</p>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Photo */}
              {selectedDiscoveryData.photo && (
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                  <Camera className="w-12 h-12 text-slate-300" />
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
                <p className="text-slate-700 leading-relaxed">{selectedDiscoveryData.description}</p>
              </div>

              {/* AI Insights */}
              {selectedDiscoveryData.aiInsights && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    AI-Generated Insights
                  </h3>
                  {selectedDiscoveryData.aiInsights.habitat && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Habitat</p>
                      <p className="text-sm text-slate-600">{selectedDiscoveryData.aiInsights.habitat}</p>
                    </div>
                  )}
                  {selectedDiscoveryData.aiInsights.behavior && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Behavior</p>
                      <p className="text-sm text-slate-600">{selectedDiscoveryData.aiInsights.behavior}</p>
                    </div>
                  )}
                  {selectedDiscoveryData.aiInsights.conservation && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Conservation</p>
                      <p className="text-sm text-slate-600">{selectedDiscoveryData.aiInsights.conservation}</p>
                    </div>
                  )}
                  {selectedDiscoveryData.aiInsights.funFacts && selectedDiscoveryData.aiInsights.funFacts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Fun Facts</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        {selectedDiscoveryData.aiInsights.funFacts.map((fact, idx) => (
                          <li key={idx}>• {fact}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Location & Date */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-800 mb-3">Discovery Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{selectedDiscoveryData.parkName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>
                      {new Date(selectedDiscoveryData.timestamp).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {selectedDiscoveryData.location && (
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span>
                        {selectedDiscoveryData.location.lat.toFixed(6)}, {selectedDiscoveryData.location.lng.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Link to Hike */}
              {selectedDiscoveryData.hikeId && (
                <button
                  onClick={() => {
                    setSelectedDiscovery(null);
                    router.push(`/journal/hikes/${selectedDiscoveryData.hikeId}`);
                  }}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  View originating hike
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

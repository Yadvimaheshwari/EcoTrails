'use client';

import { MapPin, Droplets, Eye, TrendingDown, Users, Trees } from 'lucide-react';

interface QuickExploreCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  query: string;
}

interface ExploreQuickExploreProps {
  onCategorySelect: (query: string) => void;
  hasNearbyParks?: boolean;
}

export function ExploreQuickExplore({
  onCategorySelect,
  hasNearbyParks = false,
}: ExploreQuickExploreProps) {
  const categories: QuickExploreCategory[] = [
    ...(hasNearbyParks
      ? [
          {
            id: 'nearby',
            label: 'Parks near you',
            icon: <MapPin className="w-5 h-5" />,
            query: 'nearby',
          },
        ]
      : []),
    {
      id: 'waterfalls',
      label: 'Waterfall hikes',
      icon: <Droplets className="w-5 h-5" />,
      query: 'waterfall trail',
    },
    {
      id: 'views',
      label: 'Scenic views',
      icon: <Eye className="w-5 h-5" />,
      query: 'scenic view trail',
    },
    {
      id: 'beginner',
      label: 'Beginner friendly',
      icon: <TrendingDown className="w-5 h-5" />,
      query: 'easy trail',
    },
    {
      id: 'less-crowded',
      label: 'Less crowded',
      icon: <Users className="w-5 h-5" />,
      query: 'less crowded trail',
    },
    {
      id: 'national-parks',
      label: 'National Parks',
      icon: <Trees className="w-5 h-5" />,
      query: 'national park',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium text-slate-800 mb-3">Quick explore</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect(category.query)}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-2 px-4 py-3 min-w-[120px] bg-white border-2 border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <div className="text-slate-700">{category.icon}</div>
            <span className="text-xs font-medium text-slate-700 text-center leading-tight">
              {category.label}
            </span>
          </button>
        ))}
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

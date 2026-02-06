'use client';

import { useState } from 'react';
import JSZip from 'jszip';

interface ExportButtonProps {
  hike: any;
}

export function ExportButton({ hike }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportData = async (format: 'json' | 'csv') => {
    setExporting(true);

    try {
      if (format === 'json') {
        const data = {
          hike: {
            id: hike.id,
            name: hike.name,
            startTime: hike.startTime,
            endTime: hike.endTime,
            totalDistanceMiles: hike.totalDistanceMiles,
            totalElevationGainFt: hike.totalElevationGainFt,
            route: hike.route,
            observations: hike.observations,
          },
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hike-${hike.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const rows = [
          ['Timestamp', 'Latitude', 'Longitude', 'Altitude'],
          ...(hike.route || []).map((point: any) => [
            point.timestamp,
            point.location?.lat || '',
            point.location?.lng || '',
            point.location?.altitude || '',
          ]),
        ];

        const csv = rows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hike-${hike.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => exportData('json')}
        disabled={exporting}
        className="w-full text-center py-2 px-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
      >
        {exporting ? 'Exporting...' : 'Export JSON'}
      </button>
      <button
        onClick={() => exportData('csv')}
        disabled={exporting}
        className="w-full text-center py-2 px-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 text-sm"
      >
        {exporting ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  );
}

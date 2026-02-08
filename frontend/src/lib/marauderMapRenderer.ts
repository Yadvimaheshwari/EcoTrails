/**
 * Marauder Map Renderer
 * Creates an aesthetic illustrated map style from real trail data
 */

interface TrailPoint {
  lat: number;
  lng: number;
  elevation?: number;
  distance?: number;
}

interface Callout {
  id: string;
  type: 'segment' | 'difficulty' | 'water' | 'viewpoint' | 'hazard' | 'regulation' | 'seasonal' | 'wildlife' | 'vegetation';
  position: { lat: number; lng: number };
  label: string;
  description?: string;
  icon?: string;
}

interface MarauderMapData {
  polyline: TrailPoint[];
  pois: Array<{ lat: number; lng: number; name: string; type: string }>;
  boundingBox: { north: number; south: number; east: number; west: number };
  metadata?: {
    difficulty?: string;
    regulations?: string[];
    seasonal_notes?: string[];
    region?: string;
    elevation_range?: { min: number; max: number };
  };
}

export class MarauderMapRenderer {
  private data: MarauderMapData;
  private callouts: Callout[] = [];
  private elevationProfile: Array<{ distance: number; elevation: number }> = [];

  constructor(data: MarauderMapData) {
    this.data = data;
    this.processData();
  }

  private processData(): void {
    // Calculate elevation profile
    this.calculateElevationProfile();
    
    // Generate callouts from real data
    this.generateCallouts();
  }

  private calculateElevationProfile(): void {
    if (!this.data.polyline || this.data.polyline.length === 0) return;

    let cumulativeDistance = 0;
    this.elevationProfile = [];

    for (let i = 0; i < this.data.polyline.length; i++) {
      const point = this.data.polyline[i];
      
      if (i > 0) {
        const prevPoint = this.data.polyline[i - 1];
        const distance = this.haversineDistance(
          prevPoint.lat,
          prevPoint.lng,
          point.lat,
          point.lng
        );
        cumulativeDistance += distance;
      }

      if (point.elevation !== undefined) {
        this.elevationProfile.push({
          distance: cumulativeDistance,
          elevation: point.elevation,
        });
      }
    }
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private generateCallouts(): void {
    this.callouts = [];

    // Trail segments (based on elevation changes)
    this.generateSegmentCallouts();

    // Difficulty spikes (steep sections)
    this.generateDifficultyCallouts();

    // Water sources (from POIs)
    this.generateWaterCallouts();

    // Viewpoints (from POIs)
    this.generateViewpointCallouts();

    // Hazards (from metadata or steep sections)
    this.generateHazardCallouts();

    // Regulations (from metadata)
    this.generateRegulationCallouts();

    // Seasonal notes (from metadata)
    this.generateSeasonalCallouts();

    // Possible wildlife zones (based on elevation + region)
    this.generateWildlifeCallouts();

    // Vegetation zones (based on elevation bands)
    this.generateVegetationCallouts();
  }

  private generateSegmentCallouts(): void {
    if (this.elevationProfile.length < 2) return;

    const segments = this.identifySegments();
    segments.forEach((segment, idx) => {
      const midPoint = this.getPointAtDistance(segment.startDistance + (segment.endDistance - segment.startDistance) / 2);
      if (midPoint) {
        this.callouts.push({
          id: `segment-${idx}`,
          type: 'segment',
          position: midPoint,
          label: segment.label,
          description: segment.description,
          icon: '📍',
        });
      }
    });
  }

  private identifySegments(): Array<{ startDistance: number; endDistance: number; label: string; description: string }> {
    const segments: Array<{ startDistance: number; endDistance: number; label: string; description: string }> = [];
    
    if (this.elevationProfile.length < 2) {
      if (this.data.polyline.length > 0) {
        const totalDistance = this.calculateTotalDistance();
        segments.push({
          startDistance: 0,
          endDistance: totalDistance,
          label: 'Trail',
          description: 'Main trail route',
        });
      }
      return segments;
    }

    // Identify elevation-based segments
    let currentSegment = { start: 0, startElevation: this.elevationProfile[0].elevation };
    const elevationChangeThreshold = 200; // feet

    for (let i = 1; i < this.elevationProfile.length; i++) {
      const elevationChange = Math.abs(this.elevationProfile[i].elevation - currentSegment.startElevation);
      
      if (elevationChange > elevationChangeThreshold) {
        const segmentDistance = this.elevationProfile[i - 1].distance - this.elevationProfile[currentSegment.start].distance;
        if (segmentDistance > 0.1) { // At least 0.1 miles
          const isClimb = this.elevationProfile[i].elevation > currentSegment.startElevation;
          segments.push({
            startDistance: this.elevationProfile[currentSegment.start].distance,
            endDistance: this.elevationProfile[i - 1].distance,
            label: isClimb ? 'Climb' : 'Descent',
            description: `${Math.round(elevationChange)} ft ${isClimb ? 'ascent' : 'descent'}`,
          });
        }
        currentSegment = { start: i - 1, startElevation: this.elevationProfile[i].elevation };
      }
    }

    // Add final segment
    if (segments.length === 0 || segments[segments.length - 1].endDistance < this.elevationProfile[this.elevationProfile.length - 1].distance) {
      const lastSegment = segments.length > 0 ? segments[segments.length - 1] : null;
      segments.push({
        startDistance: lastSegment ? lastSegment.endDistance : 0,
        endDistance: this.elevationProfile[this.elevationProfile.length - 1].distance,
        label: 'Trail',
        description: 'Main trail route',
      });
    }

    return segments;
  }

  private calculateTotalDistance(): number {
    if (this.data.polyline.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < this.data.polyline.length; i++) {
      total += this.haversineDistance(
        this.data.polyline[i - 1].lat,
        this.data.polyline[i - 1].lng,
        this.data.polyline[i].lat,
        this.data.polyline[i].lng
      );
    }
    return total;
  }

  private generateDifficultyCallouts(): void {
    if (this.elevationProfile.length < 3) return;

    // Find steep sections (high elevation change per distance)
    for (let i = 1; i < this.elevationProfile.length; i++) {
      const distance = this.elevationProfile[i].distance - this.elevationProfile[i - 1].distance;
      if (distance < 0.01) continue; // Skip very close points
      
      const elevationChange = Math.abs(this.elevationProfile[i].elevation - this.elevationProfile[i - 1].elevation);
      const grade = (elevationChange / (distance * 5280)) * 100; // Grade as percentage
      
      if (grade > 15) { // Steep section (>15% grade)
        const midPoint = this.getPointAtDistance((this.elevationProfile[i].distance + this.elevationProfile[i - 1].distance) / 2);
        if (midPoint) {
          this.callouts.push({
            id: `difficulty-${i}`,
            type: 'difficulty',
            position: midPoint,
            label: 'Steep Section',
            description: `${Math.round(grade)}% grade`,
            icon: '⚠️',
          });
        }
      }
    }
  }

  private generateWaterCallouts(): void {
    this.data.pois?.forEach((poi, idx) => {
      if (poi.type === 'water' || poi.name.toLowerCase().includes('water') || poi.name.toLowerCase().includes('creek') || poi.name.toLowerCase().includes('stream')) {
        this.callouts.push({
          id: `water-${idx}`,
          type: 'water',
          position: { lat: poi.lat, lng: poi.lng },
          label: poi.name || 'Water Source',
          description: 'Water available',
          icon: '💧',
        });
      }
    });
  }

  private generateViewpointCallouts(): void {
    this.data.pois?.forEach((poi, idx) => {
      if (poi.type === 'viewpoint' || poi.name.toLowerCase().includes('view') || poi.name.toLowerCase().includes('overlook') || poi.name.toLowerCase().includes('summit')) {
        this.callouts.push({
          id: `viewpoint-${idx}`,
          type: 'viewpoint',
          position: { lat: poi.lat, lng: poi.lng },
          label: poi.name || 'Viewpoint',
          description: 'Scenic viewpoint',
          icon: '👁️',
        });
      }
    });
  }

  private generateHazardCallouts(): void {
    // Add hazards based on steep sections or metadata
    if (this.data.metadata?.regulations) {
      this.data.metadata.regulations.forEach((reg, idx) => {
        if (reg.toLowerCase().includes('hazard') || reg.toLowerCase().includes('danger') || reg.toLowerCase().includes('caution')) {
          // Place at midpoint of trail
          const midPoint = this.getPointAtDistance(this.calculateTotalDistance() / 2);
          if (midPoint) {
            this.callouts.push({
              id: `hazard-${idx}`,
              type: 'hazard',
              position: midPoint,
              label: 'Hazard',
              description: reg,
              icon: '⚠️',
            });
          }
        }
      });
    }
  }

  private generateRegulationCallouts(): void {
    if (this.data.metadata?.regulations) {
      this.data.metadata.regulations.forEach((reg, idx) => {
        if (!reg.toLowerCase().includes('hazard') && !reg.toLowerCase().includes('danger')) {
          const midPoint = this.getPointAtDistance(this.calculateTotalDistance() / 2);
          if (midPoint) {
            this.callouts.push({
              id: `regulation-${idx}`,
              type: 'regulation',
              position: midPoint,
              label: 'Regulation',
              description: reg,
              icon: '📋',
            });
          }
        }
      });
    }
  }

  private generateSeasonalCallouts(): void {
    if (this.data.metadata?.seasonal_notes && this.data.metadata.seasonal_notes.length > 0) {
      this.data.metadata.seasonal_notes.forEach((note, idx) => {
        const midPoint = this.getPointAtDistance(this.calculateTotalDistance() / 2);
        if (midPoint) {
          this.callouts.push({
            id: `seasonal-${idx}`,
            type: 'seasonal',
            position: midPoint,
            label: 'Seasonal Note',
            description: note,
            icon: '🍂',
          });
        }
      });
    }
  }

  private generateWildlifeCallouts(): void {
    // Generate based on elevation bands and region metadata
    if (!this.data.metadata?.elevation_range && this.elevationProfile.length === 0) return;

    const elevationRange = this.data.metadata?.elevation_range || {
      min: Math.min(...this.elevationProfile.map(p => p.elevation)),
      max: Math.max(...this.elevationProfile.map(p => p.elevation)),
    };

    const region = this.data.metadata?.region || '';

    // Identify elevation bands where wildlife might be present
    const bands = [
      { min: 0, max: 3000, label: 'Low Elevation', possible: ['Deer', 'Birds', 'Small Mammals'] },
      { min: 3000, max: 6000, label: 'Mid Elevation', possible: ['Deer', 'Elk', 'Bears', 'Birds'] },
      { min: 6000, max: 9000, label: 'High Elevation', possible: ['Elk', 'Mountain Goats', 'Birds'] },
      { min: 9000, max: Infinity, label: 'Alpine', possible: ['Mountain Goats', 'Birds'] },
    ];

    bands.forEach((band, bandIdx) => {
      if (elevationRange.min <= band.max && elevationRange.max >= band.min) {
        // Find a point in this elevation band
        const pointInBand = this.findPointInElevationBand(band.min, band.max);
        if (pointInBand) {
          this.callouts.push({
            id: `wildlife-${bandIdx}`,
            type: 'wildlife',
            position: pointInBand,
            label: 'Possible Wildlife',
            description: `${band.label} zone - may include: ${band.possible.join(', ')}`,
            icon: '🦌',
          });
        }
      }
    });
  }

  private generateVegetationCallouts(): void {
    // Generate based on elevation bands
    if (!this.data.metadata?.elevation_range && this.elevationProfile.length === 0) return;

    const elevationRange = this.data.metadata?.elevation_range || {
      min: Math.min(...this.elevationProfile.map(p => p.elevation)),
      max: Math.max(...this.elevationProfile.map(p => p.elevation)),
    };

    const vegetationZones = [
      { min: 0, max: 3000, label: 'Lowland Forest', types: ['Deciduous', 'Mixed'] },
      { min: 3000, max: 6000, label: 'Montane Forest', types: ['Coniferous', 'Mixed'] },
      { min: 6000, max: 9000, label: 'Subalpine', types: ['Coniferous', 'Alpine Meadows'] },
      { min: 9000, max: Infinity, label: 'Alpine', types: ['Alpine Tundra', 'Rock'] },
    ];

    vegetationZones.forEach((zone, zoneIdx) => {
      if (elevationRange.min <= zone.max && elevationRange.max >= zone.min) {
        const pointInZone = this.findPointInElevationBand(zone.min, zone.max);
        if (pointInZone) {
          this.callouts.push({
            id: `vegetation-${zoneIdx}`,
            type: 'vegetation',
            position: pointInZone,
            label: zone.label,
            description: `Typical vegetation: ${zone.types.join(', ')}`,
            icon: '🌲',
          });
        }
      }
    });
  }

  private findPointInElevationBand(minElev: number, maxElev: number): { lat: number; lng: number } | null {
    for (let i = 0; i < this.elevationProfile.length; i++) {
      if (this.elevationProfile[i].elevation >= minElev && this.elevationProfile[i].elevation <= maxElev) {
        return this.getPointAtDistance(this.elevationProfile[i].distance);
      }
    }
    return null;
  }

  private getPointAtDistance(targetDistance: number): { lat: number; lng: number } | null {
    if (!this.data.polyline || this.data.polyline.length === 0) return null;
    if (this.data.polyline.length === 1) return { lat: this.data.polyline[0].lat, lng: this.data.polyline[0].lng };

    let cumulativeDistance = 0;
    for (let i = 1; i < this.data.polyline.length; i++) {
      const segmentDistance = this.haversineDistance(
        this.data.polyline[i - 1].lat,
        this.data.polyline[i - 1].lng,
        this.data.polyline[i].lat,
        this.data.polyline[i].lng
      );

      if (cumulativeDistance + segmentDistance >= targetDistance) {
        // Interpolate
        const ratio = (targetDistance - cumulativeDistance) / segmentDistance;
        return {
          lat: this.data.polyline[i - 1].lat + (this.data.polyline[i].lat - this.data.polyline[i - 1].lat) * ratio,
          lng: this.data.polyline[i - 1].lng + (this.data.polyline[i].lng - this.data.polyline[i - 1].lng) * ratio,
        };
      }
      cumulativeDistance += segmentDistance;
    }

    // Return last point if target is beyond trail
    const last = this.data.polyline[this.data.polyline.length - 1];
    return { lat: last.lat, lng: last.lng };
  }

  render(width: number = 800, height: number = 600): string {
    const bounds = this.data.boundingBox;
    const latRange = bounds.north - bounds.south;
    const lngRange = bounds.east - bounds.west;
    const latScale = height / latRange;
    const lngScale = width / lngRange;

    const toX = (lng: number) => ((lng - bounds.west) * lngScale);
    const toY = (lat: number) => (height - (lat - bounds.south) * latScale);

    // Parchment background with texture
    let svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="parchment">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
            <feColorMatrix in="noise" type="saturate" values="0"/>
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 0.1 0.1 0.1 0.1"/>
            </feComponentTransfer>
          </filter>
          <pattern id="parchmentPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="#F4E4BC" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="#F4E4BC"/>
        <rect width="${width}" height="${height}" fill="url(#parchmentPattern)" opacity="0.2"/>
    `;

    // Draw contour lines (simplified - based on elevation if available)
    if (this.elevationProfile.length > 0) {
      svg += this.renderContours(toX, toY, width, height);
    }

    // Draw trail polyline with ink style
    if (this.data.polyline && this.data.polyline.length > 0) {
      const points = this.data.polyline
        .map((point) => {
          const lat = point.lat;
          const lng = point.lng;
          if (isNaN(lat) || isNaN(lng)) return null;
          return `${toX(lng)},${toY(lat)}`;
        })
        .filter((p): p is string => p !== null)
        .join(' ');
      
      if (points) {
        svg += `
          <polyline 
            points="${points}" 
            fill="none" 
            stroke="#2C1810" 
            stroke-width="3" 
            opacity="0.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polyline 
            points="${points}" 
            fill="none" 
            stroke="#8B4513" 
            stroke-width="2" 
            opacity="0.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        `;
      }
    }

    // Draw callouts
    this.callouts.forEach((callout) => {
      const x = toX(callout.position.lng);
      const y = toY(callout.position.lat);
      
      svg += `
        <g>
          <circle cx="${x}" cy="${y}" r="6" fill="#8B4513" stroke="#2C1810" stroke-width="2"/>
          <text x="${x}" y="${y - 15}" font-size="16" text-anchor="middle" fill="#2C1810" font-family="serif">${callout.icon || '📍'}</text>
          <rect x="${x + 10}" y="${y - 25}" width="${callout.label.length * 7 + 10}" height="20" fill="#F4E4BC" stroke="#2C1810" stroke-width="1" rx="3" opacity="0.95"/>
          <text x="${x + 15}" y="${y - 10}" font-size="11" fill="#2C1810" font-family="serif" font-weight="bold">${callout.label}</text>
          ${callout.description ? `
            <text x="${x + 15}" y="${y + 5}" font-size="9" fill="#5C3A20" font-family="serif">${callout.description}</text>
          ` : ''}
        </g>
      `;
    });

    svg += '</svg>';
    return svg;
  }

  private renderContours(toX: (lng: number) => number, toY: (lat: number) => number, width: number, height: number): string {
    if (this.elevationProfile.length < 2) return '';

    // Simplified contour rendering - draw elevation bands
    const minElev = Math.min(...this.elevationProfile.map(p => p.elevation));
    const maxElev = Math.max(...this.elevationProfile.map(p => p.elevation));
    const elevRange = maxElev - minElev;
    
    if (elevRange < 100) return ''; // Skip if elevation range is too small

    const contourInterval = Math.max(200, Math.round(elevRange / 5)); // 200ft intervals or 5 bands
    let svg = '';

    // Draw subtle elevation bands along the trail
    for (let elev = Math.ceil(minElev / contourInterval) * contourInterval; elev <= maxElev; elev += contourInterval) {
      const points: Array<{ x: number; y: number }> = [];
      
      for (let i = 0; i < this.elevationProfile.length; i++) {
        if (Math.abs(this.elevationProfile[i].elevation - elev) < contourInterval / 2) {
          const point = this.getPointAtDistance(this.elevationProfile[i].distance);
          if (point) {
            points.push({ x: toX(point.lng), y: toY(point.lat) });
          }
        }
      }

      if (points.length > 1) {
        const path = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        svg += `
          <path 
            d="${path}" 
            fill="none" 
            stroke="#8B6F47" 
            stroke-width="1" 
            opacity="0.3"
            stroke-dasharray="3,3"
          />
        `;
      }
    }

    return svg;
  }

  getCallouts(): Callout[] {
    return this.callouts;
  }

  getLegend(): Array<{ icon: string; label: string; description: string }> {
    return [
      { icon: '📍', label: 'Trail Segment', description: 'Trail section identifier' },
      { icon: '⚠️', label: 'Steep Section', description: 'High grade section' },
      { icon: '💧', label: 'Water Source', description: 'Water available' },
      { icon: '👁️', label: 'Viewpoint', description: 'Scenic viewpoint' },
      { icon: '⚠️', label: 'Hazard', description: 'Potential hazard' },
      { icon: '📋', label: 'Regulation', description: 'Trail regulation' },
      { icon: '🍂', label: 'Seasonal Note', description: 'Seasonal information' },
      { icon: '🦌', label: 'Possible Wildlife', description: 'Wildlife may be present' },
      { icon: '🌲', label: 'Vegetation Zone', description: 'Vegetation type' },
    ];
  }
}

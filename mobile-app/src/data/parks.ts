/**
 * Comprehensive US National and State Parks Database
 * One-stop shop for hikers
 */

export interface Park {
  id: string;
  name: string;
  type: 'National Park' | 'National Forest' | 'State Park' | 'National Monument' | 'National Recreation Area' | 'Wilderness Area';
  state: string;
  states?: string[]; // For parks spanning multiple states
  coordinates: {
    lat: number;
    lng: number;
  };
  icon: string;
  description?: string;
  established?: number;
  area?: string; // in acres or square miles
  elevation?: string;
  features?: string[]; // Key features like "Mountains", "Lakes", "Wildlife", etc.
}

export const US_PARKS: Park[] = [
  // National Parks
  { id: 'acadia', name: 'Acadia National Park', type: 'National Park', state: 'Maine', coordinates: { lat: 44.3386, lng: -68.2733 }, icon: '🏔️', established: 1919, area: '49,075 acres', features: ['Mountains', 'Coastline', 'Lakes', 'Wildlife'] },
  { id: 'arches', name: 'Arches National Park', type: 'National Park', state: 'Utah', coordinates: { lat: 38.7331, lng: -109.5925 }, icon: '🏜️', established: 1971, area: '76,679 acres', features: ['Desert', 'Rock Formations', 'Hiking'] },
  { id: 'badlands', name: 'Badlands National Park', type: 'National Park', state: 'South Dakota', coordinates: { lat: 43.8554, lng: -102.3397 }, icon: '🌵', established: 1978, area: '242,756 acres', features: ['Badlands', 'Fossils', 'Wildlife'] },
  { id: 'big-bend', name: 'Big Bend National Park', type: 'National Park', state: 'Texas', coordinates: { lat: 29.1275, lng: -103.2425 }, icon: '🌵', established: 1944, area: '801,163 acres', features: ['Desert', 'Mountains', 'River', 'Wildlife'] },
  { id: 'biscayne', name: 'Biscayne National Park', type: 'National Park', state: 'Florida', coordinates: { lat: 25.4828, lng: -80.2103 }, icon: '🏝️', established: 1980, area: '172,971 acres', features: ['Marine', 'Coral Reefs', 'Mangroves'] },
  { id: 'black-canyon', name: 'Black Canyon of the Gunnison', type: 'National Park', state: 'Colorado', coordinates: { lat: 38.5758, lng: -107.7242 }, icon: '⛰️', established: 1999, area: '30,750 acres', features: ['Canyon', 'Rock Climbing', 'Wildlife'] },
  { id: 'bryce-canyon', name: 'Bryce Canyon National Park', type: 'National Park', state: 'Utah', coordinates: { lat: 37.5930, lng: -112.1871 }, icon: '🏜️', established: 1928, area: '35,835 acres', features: ['Hoodoos', 'Hiking', 'Stargazing'] },
  { id: 'canyonlands', name: 'Canyonlands National Park', type: 'National Park', state: 'Utah', coordinates: { lat: 38.3269, lng: -109.8783 }, icon: '🏜️', established: 1964, area: '337,598 acres', features: ['Canyons', 'Rivers', 'Hiking', 'Rafting'] },
  { id: 'capitol-reef', name: 'Capitol Reef National Park', type: 'National Park', state: 'Utah', coordinates: { lat: 38.3670, lng: -111.2615 }, icon: '🏜️', established: 1971, area: '241,904 acres', features: ['Waterpocket Fold', 'Hiking', 'Scenic Drives'] },
  { id: 'carlsbad-caverns', name: 'Carlsbad Caverns National Park', type: 'National Park', state: 'New Mexico', coordinates: { lat: 32.1479, lng: -104.5570 }, icon: '🕳️', established: 1930, area: '46,766 acres', features: ['Caves', 'Bats', 'Hiking'] },
  { id: 'channel-islands', name: 'Channel Islands National Park', type: 'National Park', state: 'California', coordinates: { lat: 34.0050, lng: -119.4179 }, icon: '🏝️', established: 1980, area: '249,561 acres', features: ['Islands', 'Marine Life', 'Wildlife'] },
  { id: 'congaree', name: 'Congaree National Park', type: 'National Park', state: 'South Carolina', coordinates: { lat: 33.7915, lng: -80.7492 }, icon: '🌲', established: 2003, area: '26,276 acres', features: ['Old Growth Forest', 'Swamp', 'Wildlife'] },
  { id: 'crater-lake', name: 'Crater Lake National Park', type: 'National Park', state: 'Oregon', coordinates: { lat: 42.8684, lng: -122.1685 }, icon: '💙', established: 1902, area: '183,224 acres', features: ['Volcanic Lake', 'Hiking', 'Wildlife'] },
  { id: 'cuyahoga-valley', name: 'Cuyahoga Valley National Park', type: 'National Park', state: 'Ohio', coordinates: { lat: 41.2808, lng: -81.5678 }, icon: '🌲', established: 2000, area: '32,572 acres', features: ['Waterfalls', 'Hiking', 'Biking'] },
  { id: 'death-valley', name: 'Death Valley National Park', type: 'National Park', state: 'California', states: ['California', 'Nevada'], coordinates: { lat: 36.5054, lng: -117.0794 }, icon: '🌡️', established: 1994, area: '3,373,063 acres', features: ['Desert', 'Salt Flats', 'Wildlife'] },
  { id: 'denali', name: 'Denali National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 63.0692, lng: -151.0070 }, icon: '🏔️', established: 1917, area: '4,740,911 acres', features: ['Mountains', 'Wildlife', 'Tundra'] },
  { id: 'dry-tortugas', name: 'Dry Tortugas National Park', type: 'National Park', state: 'Florida', coordinates: { lat: 24.6286, lng: -82.8731 }, icon: '🏝️', established: 1992, area: '64,701 acres', features: ['Islands', 'Fort', 'Marine Life'] },
  { id: 'everglades', name: 'Everglades National Park', type: 'National Park', state: 'Florida', coordinates: { lat: 25.2866, lng: -80.8987 }, icon: '🐊', established: 1947, area: '1,508,938 acres', features: ['Wetlands', 'Wildlife', 'Mangroves'] },
  { id: 'gates-of-the-arctic', name: 'Gates of the Arctic', type: 'National Park', state: 'Alaska', coordinates: { lat: 67.7478, lng: -153.4650 }, icon: '❄️', established: 1980, area: '7,523,897 acres', features: ['Arctic', 'Wilderness', 'Wildlife'] },
  { id: 'glacier', name: 'Glacier National Park', type: 'National Park', state: 'Montana', coordinates: { lat: 48.7596, lng: -113.7870 }, icon: '🏔️', established: 1910, area: '1,013,322 acres', features: ['Glaciers', 'Mountains', 'Lakes', 'Wildlife'] },
  { id: 'glacier-bay', name: 'Glacier Bay National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 58.6658, lng: -136.9002 }, icon: '🧊', established: 1980, area: '3,223,384 acres', features: ['Glaciers', 'Marine', 'Wildlife'] },
  { id: 'grand-canyon', name: 'Grand Canyon National Park', type: 'National Park', state: 'Arizona', coordinates: { lat: 36.1069, lng: -112.1129 }, icon: '🏜️', established: 1919, area: '1,201,647 acres', features: ['Canyon', 'Hiking', 'Rafting', 'Stargazing'] },
  { id: 'grand-teton', name: 'Grand Teton National Park', type: 'National Park', state: 'Wyoming', coordinates: { lat: 43.7904, lng: -110.6818 }, icon: '🏔️', established: 1929, area: '310,044 acres', features: ['Mountains', 'Lakes', 'Wildlife', 'Hiking'] },
  { id: 'great-basin', name: 'Great Basin National Park', type: 'National Park', state: 'Nevada', coordinates: { lat: 38.9859, lng: -114.3004 }, icon: '🏔️', established: 1986, area: '77,180 acres', features: ['Mountains', 'Caves', 'Ancient Trees'] },
  { id: 'great-sand-dunes', name: 'Great Sand Dunes National Park', type: 'National Park', state: 'Colorado', coordinates: { lat: 37.7924, lng: -105.5940 }, icon: '🏜️', established: 2004, area: '149,137 acres', features: ['Sand Dunes', 'Mountains', 'Wildlife'] },
  { id: 'great-smoky-mountains', name: 'Great Smoky Mountains', type: 'National Park', state: 'Tennessee', states: ['Tennessee', 'North Carolina'], coordinates: { lat: 35.6118, lng: -83.5495 }, icon: '🌲', established: 1934, area: '522,427 acres', features: ['Mountains', 'Forests', 'Wildlife', 'Waterfalls'] },
  { id: 'guadalupe-mountains', name: 'Guadalupe Mountains National Park', type: 'National Park', state: 'Texas', coordinates: { lat: 31.9230, lng: -104.8725 }, icon: '🏔️', established: 1972, area: '86,367 acres', features: ['Mountains', 'Desert', 'Caves'] },
  { id: 'haleakala', name: 'Haleakalā National Park', type: 'National Park', state: 'Hawaii', coordinates: { lat: 20.7208, lng: -156.1550 }, icon: '🌋', established: 1916, area: '33,265 acres', features: ['Volcano', 'Rainforest', 'Wildlife'] },
  { id: 'hawaii-volcanoes', name: 'Hawaiʻi Volcanoes National Park', type: 'National Park', state: 'Hawaii', coordinates: { lat: 19.4194, lng: -155.2883 }, icon: '🌋', established: 1916, area: '323,431 acres', features: ['Volcanoes', 'Lava Flows', 'Rainforest'] },
  { id: 'hot-springs', name: 'Hot Springs National Park', type: 'National Park', state: 'Arkansas', coordinates: { lat: 34.5244, lng: -93.0633 }, icon: '♨️', established: 1921, area: '5,549 acres', features: ['Hot Springs', 'Historic Bathhouses'] },
  { id: 'indiana-dunes', name: 'Indiana Dunes National Park', type: 'National Park', state: 'Indiana', coordinates: { lat: 41.6533, lng: -87.0524 }, icon: '🏖️', established: 2019, area: '15,349 acres', features: ['Dunes', 'Beaches', 'Wetlands'] },
  { id: 'isle-royale', name: 'Isle Royale National Park', type: 'National Park', state: 'Michigan', coordinates: { lat: 48.1000, lng: -88.5500 }, icon: '🏝️', established: 1940, area: '571,790 acres', features: ['Island', 'Wilderness', 'Wildlife'] },
  { id: 'joshua-tree', name: 'Joshua Tree National Park', type: 'National Park', state: 'California', coordinates: { lat: 33.8734, lng: -116.3139 }, icon: '🌵', established: 1994, area: '790,636 acres', features: ['Desert', 'Rock Formations', 'Stargazing'] },
  { id: 'katmai', name: 'Katmai National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 58.5000, lng: -155.0000 }, icon: '🐻', established: 1980, area: '3,674,529 acres', features: ['Volcanoes', 'Bears', 'Wildlife'] },
  { id: 'kenai-fjords', name: 'Kenai Fjords National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 59.9221, lng: -149.6500 }, icon: '🧊', established: 1980, area: '669,650 acres', features: ['Glaciers', 'Fjords', 'Marine Life'] },
  { id: 'kings-canyon', name: 'Kings Canyon National Park', type: 'National Park', state: 'California', coordinates: { lat: 36.8879, lng: -118.5551 }, icon: '🏔️', established: 1940, area: '461,901 acres', features: ['Mountains', 'Canyons', 'Giant Sequoias'] },
  { id: 'kobuk-valley', name: 'Kobuk Valley National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 67.3500, lng: -159.1667 }, icon: '🏜️', established: 1980, area: '1,750,716 acres', features: ['Sand Dunes', 'Arctic', 'Wildlife'] },
  { id: 'lake-clark', name: 'Lake Clark National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 60.9667, lng: -153.4167 }, icon: '🏔️', established: 1980, area: '2,619,816 acres', features: ['Mountains', 'Lakes', 'Volcanoes'] },
  { id: 'lassen-volcanic', name: 'Lassen Volcanic National Park', type: 'National Park', state: 'California', coordinates: { lat: 40.4977, lng: -121.4204 }, icon: '🌋', established: 1916, area: '106,589 acres', features: ['Volcanoes', 'Hot Springs', 'Lakes'] },
  { id: 'mammoth-cave', name: 'Mammoth Cave National Park', type: 'National Park', state: 'Kentucky', coordinates: { lat: 37.1869, lng: -86.1000 }, icon: '🕳️', established: 1941, area: '52,830 acres', features: ['Caves', 'River', 'Wildlife'] },
  { id: 'mesa-verde', name: 'Mesa Verde National Park', type: 'National Park', state: 'Colorado', coordinates: { lat: 37.2309, lng: -108.4618 }, icon: '🏛️', established: 1906, area: '52,485 acres', features: ['Cliff Dwellings', 'Archaeology', 'Hiking'] },
  { id: 'mount-rainier', name: 'Mount Rainier National Park', type: 'National Park', state: 'Washington', coordinates: { lat: 46.8800, lng: -121.7269 }, icon: '🏔️', established: 1899, area: '236,381 acres', features: ['Volcano', 'Glaciers', 'Wildflowers'] },
  { id: 'new-river-gorge', name: 'New River Gorge National Park', type: 'National Park', state: 'West Virginia', coordinates: { lat: 38.0667, lng: -81.0833 }, icon: '🌊', established: 2020, area: '72,808 acres', features: ['Gorge', 'River', 'Rock Climbing'] },
  { id: 'north-cascades', name: 'North Cascades National Park', type: 'National Park', state: 'Washington', coordinates: { lat: 48.7718, lng: -121.2985 }, icon: '🏔️', established: 1968, area: '504,780 acres', features: ['Mountains', 'Glaciers', 'Wilderness'] },
  { id: 'olympic', name: 'Olympic National Park', type: 'National Park', state: 'Washington', coordinates: { lat: 47.8021, lng: -123.6044 }, icon: '🌲', established: 1938, area: '922,650 acres', features: ['Rainforest', 'Mountains', 'Coastline'] },
  { id: 'petrified-forest', name: 'Petrified Forest National Park', type: 'National Park', state: 'Arizona', coordinates: { lat: 35.0657, lng: -109.7815 }, icon: '🪨', established: 1962, area: '221,390 acres', features: ['Petrified Wood', 'Fossils', 'Painted Desert'] },
  { id: 'pinnacles', name: 'Pinnacles National Park', type: 'National Park', state: 'California', coordinates: { lat: 36.4914, lng: -121.1831 }, icon: '⛰️', established: 2013, area: '26,606 acres', features: ['Rock Formations', 'Caves', 'Wildlife'] },
  { id: 'redwood', name: 'Redwood National Park', type: 'National Park', state: 'California', coordinates: { lat: 41.2132, lng: -124.0046 }, icon: '🌲', established: 1968, area: '138,999 acres', features: ['Giant Redwoods', 'Coastline', 'Wildlife'] },
  { id: 'rocky-mountain', name: 'Rocky Mountain National Park', type: 'National Park', state: 'Colorado', coordinates: { lat: 40.3428, lng: -105.6836 }, icon: '🏔️', established: 1915, area: '265,807 acres', features: ['Mountains', 'Lakes', 'Wildlife', 'Alpine Tundra'] },
  { id: 'saguaro', name: 'Saguaro National Park', type: 'National Park', state: 'Arizona', coordinates: { lat: 32.1473, lng: -110.7857 }, icon: '🌵', established: 1994, area: '91,716 acres', features: ['Desert', 'Cacti', 'Wildlife'] },
  { id: 'sequoia', name: 'Sequoia National Park', type: 'National Park', state: 'California', coordinates: { lat: 36.4864, lng: -118.5658 }, icon: '🌲', established: 1890, area: '404,063 acres', features: ['Giant Sequoias', 'Mountains', 'Caves'] },
  { id: 'shenandoah', name: 'Shenandoah National Park', type: 'National Park', state: 'Virginia', coordinates: { lat: 38.4755, lng: -78.4535 }, icon: '🌲', established: 1935, area: '199,223 acres', features: ['Mountains', 'Skyline Drive', 'Wildlife'] },
  { id: 'theodore-roosevelt', name: 'Theodore Roosevelt National Park', type: 'National Park', state: 'North Dakota', coordinates: { lat: 46.9789, lng: -103.5383 }, icon: '🐎', established: 1978, area: '70,446 acres', features: ['Badlands', 'Wildlife', 'Historic Sites'] },
  { id: 'virgin-islands', name: 'Virgin Islands National Park', type: 'National Park', state: 'US Virgin Islands', coordinates: { lat: 18.3381, lng: -64.7981 }, icon: '🏝️', established: 1956, area: '14,737 acres', features: ['Beaches', 'Coral Reefs', 'Historic Sites'] },
  { id: 'voyageurs', name: 'Voyageurs National Park', type: 'National Park', state: 'Minnesota', coordinates: { lat: 48.5000, lng: -92.8833 }, icon: '🛶', established: 1975, area: '218,200 acres', features: ['Lakes', 'Waterways', 'Wildlife'] },
  { id: 'white-sands', name: 'White Sands National Park', type: 'National Park', state: 'New Mexico', coordinates: { lat: 32.7797, lng: -106.1717 }, icon: '🏜️', established: 2019, area: '145,762 acres', features: ['Sand Dunes', 'Desert', 'Wildlife'] },
  { id: 'wind-cave', name: 'Wind Cave National Park', type: 'National Park', state: 'South Dakota', coordinates: { lat: 43.5569, lng: -103.4781 }, icon: '🕳️', established: 1903, area: '33,851 acres', features: ['Caves', 'Prairie', 'Wildlife'] },
  { id: 'wrangell-st-elias', name: 'Wrangell-St. Elias National Park', type: 'National Park', state: 'Alaska', coordinates: { lat: 61.0000, lng: -142.0000 }, icon: '🏔️', established: 1980, area: '8,323,146 acres', features: ['Mountains', 'Glaciers', 'Wilderness'] },
  { id: 'yellowstone', name: 'Yellowstone National Park', type: 'National Park', state: 'Wyoming', states: ['Wyoming', 'Montana', 'Idaho'], coordinates: { lat: 44.4280, lng: -110.5885 }, icon: '🌋', established: 1872, area: '2,219,791 acres', features: ['Geysers', 'Hot Springs', 'Wildlife', 'Mountains'] },
  { id: 'yosemite', name: 'Yosemite National Park', type: 'National Park', state: 'California', coordinates: { lat: 37.8651, lng: -119.5383 }, icon: '🏔️', established: 1890, area: '761,748 acres', features: ['Valley', 'Waterfalls', 'Giant Sequoias', 'Granite Cliffs'] },
  { id: 'zion', name: 'Zion National Park', type: 'National Park', state: 'Utah', coordinates: { lat: 37.2982, lng: -112.9823 }, icon: '🏜️', established: 1919, area: '146,597 acres', features: ['Canyons', 'Rivers', 'Hiking', 'Rock Climbing'] },

  // Popular State Parks (sample - can be expanded)
  { id: 'adirondack', name: 'Adirondack Park', type: 'State Park', state: 'New York', coordinates: { lat: 44.0000, lng: -74.0000 }, icon: '🌲', area: '6.1 million acres', features: ['Mountains', 'Lakes', 'Wilderness'] },
  { id: 'big-bend-ranch', name: 'Big Bend Ranch State Park', type: 'State Park', state: 'Texas', coordinates: { lat: 29.5000, lng: -103.5000 }, icon: '🌵', area: '311,000 acres', features: ['Desert', 'Mountains', 'Wildlife'] },
  { id: 'custer', name: 'Custer State Park', type: 'State Park', state: 'South Dakota', coordinates: { lat: 43.7500, lng: -103.4167 }, icon: '🐃', area: '71,000 acres', features: ['Wildlife', 'Lakes', 'Mountains'] },
  { id: 'harriman', name: 'Harriman State Park', type: 'State Park', state: 'New York', coordinates: { lat: 41.2833, lng: -74.0833 }, icon: '🌲', area: '47,527 acres', features: ['Lakes', 'Hiking', 'Wildlife'] },
  { id: 'letchworth', name: 'Letchworth State Park', type: 'State Park', state: 'New York', coordinates: { lat: 42.5833, lng: -78.0500 }, icon: '🌊', area: '14,350 acres', features: ['Waterfalls', 'Gorge', 'Hiking'] },
  { id: 'monument-valley', name: 'Monument Valley', type: 'State Park', state: 'Arizona', coordinates: { lat: 36.9833, lng: -110.1000 }, icon: '🏜️', area: '91,696 acres', features: ['Rock Formations', 'Desert', 'Scenic Views'] },
  { id: 'palisades', name: 'Palisades Interstate Park', type: 'State Park', state: 'New York', states: ['New York', 'New Jersey'], coordinates: { lat: 41.0000, lng: -73.9167 }, icon: '⛰️', area: '125,000 acres', features: ['Cliffs', 'Hiking', 'River'] },
  { id: 'watkins-glen', name: 'Watkins Glen State Park', type: 'State Park', state: 'New York', coordinates: { lat: 42.3667, lng: -76.8667 }, icon: '🌊', area: '778 acres', features: ['Gorge', 'Waterfalls', 'Hiking'] },
];

// Helper functions
export const getParksByState = (state: string): Park[] => {
  return US_PARKS.filter(park => 
    park.state === state || (park.states && park.states.includes(state))
  );
};

export const getParksByType = (type: Park['type']): Park[] => {
  return US_PARKS.filter(park => park.type === type);
};

export const searchParks = (query: string): Park[] => {
  const lowerQuery = query.toLowerCase();
  return US_PARKS.filter(park =>
    park.name.toLowerCase().includes(lowerQuery) ||
    park.state.toLowerCase().includes(lowerQuery) ||
    park.features?.some(f => f.toLowerCase().includes(lowerQuery))
  );
};

export const getAllStates = (): string[] => {
  const states = new Set<string>();
  US_PARKS.forEach(park => {
    states.add(park.state);
    if (park.states) {
      park.states.forEach(s => states.add(s));
    }
  });
  return Array.from(states).sort();
};

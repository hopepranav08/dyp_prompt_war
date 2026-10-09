import type { LatLng } from '../lib/geo.js';

export interface BlackSpot extends LatLng {
  id: string;
  name: string;
  /** 3 = repeatedly fatal corridor, 2 = official black spot, 1 = watch-list junction */
  severity: 1 | 2 | 3;
  note: string;
}

export const BLACKSPOT_SOURCES = [
  'Pune City Police Road Safety Report 2024–25 (20 MoRTH black spots, 290 road deaths in 2025)',
  'Pune Traffic Police black-spot lists 2022 & 2023 (19 and 21 locations)',
  'Pune district Road Safety Committee, 2026 (121 accident-prone locations)',
] as const;

/**
 * Accident black spots compiled from public Pune Police / district lists.
 * Coordinates are approximate (±150 m), geocoded from the published location names.
 */
export const BLACKSPOTS: readonly BlackSpot[] = [
  { id: 'navale-bridge', name: 'Navale Bridge', lat: 18.4622, lng: 73.8203, severity: 3, note: 'Steep downhill from Katraj tunnel; multi-vehicle pile-ups, 8 deaths in Nov 2025. 40 km/h limit.' },
  { id: 'navale-selfie', name: 'Navale Bridge Selfie Point', lat: 18.4561, lng: 73.8229, severity: 3, note: 'Downhill approach to Navale Bridge with brake-failure crashes by heavy vehicles.' },
  { id: 'katraj-tunnel', name: 'New Katraj Tunnel Road (Jambhulwadi)', lat: 18.4372, lng: 73.8356, severity: 3, note: 'Steep gradient on the bypass; 24x7 police post at Jambhulwadi.' },
  { id: 'dari-pul', name: 'Dari Pul Bridge (Narhe)', lat: 18.4523, lng: 73.8272, severity: 2, note: 'Bypass bridge with high-speed merging traffic.' },
  { id: 'bhumkar-chowk', name: 'Bhumkar Bridge Chowk (Narhe)', lat: 18.4497, lng: 73.8226, severity: 2, note: 'Service-road crossing on the Mumbai–Bengaluru bypass.' },
  { id: 'katraj-chowk', name: 'Katraj Chowk', lat: 18.4573, lng: 73.8583, severity: 2, note: 'Congested junction where buses and two-wheelers mix.' },
  { id: 'warje-bridge', name: 'Mutha River Bridge (Warje)', lat: 18.4832, lng: 73.8031, severity: 2, note: 'Highway bridge with pedestrian crossings and wrong-side riding.' },
  { id: 'dukkar-khind', name: 'Dukkar Khind', lat: 18.4986, lng: 73.7902, severity: 2, note: 'Ghat-style cut on the bypass between Warje and Chandni Chowk.' },
  { id: 'chandni-chowk', name: 'Chandni Chowk (Bavdhan)', lat: 18.5101, lng: 73.7806, severity: 1, note: 'Multi-level interchange with confusing merges.' },
  { id: 'hadapsar', name: 'Hadapsar Gadital (Pune–Solapur Hwy)', lat: 18.5006, lng: 73.9408, severity: 3, note: 'Pune–Solapur highway tops the district list with 46 black spots.' },
  { id: 'ibm-hadapsar', name: 'Opp. IBM Campus, Hadapsar', lat: 18.5042, lng: 73.9297, severity: 2, note: 'Pedestrian crossings on a fast highway stretch.' },
  { id: 'phursungi', name: 'Phursungi Railway Bridge Road', lat: 18.4762, lng: 73.9638, severity: 2, note: 'Narrow bridge approach with heavy trucks.' },
  { id: 'kharadi-bypass', name: 'Kharadi Bypass Chowk', lat: 18.5481, lng: 73.9361, severity: 2, note: 'IT-corridor junction with heavy peak-hour two-wheeler traffic.' },
  { id: 'swargate', name: 'Swargate Chowk', lat: 18.5018, lng: 73.8636, severity: 1, note: 'Bus depot junction with very high pedestrian density.' },
  { id: 'wakad-bridge', name: 'Wakad Bridge (Mumbai–Bengaluru Hwy)', lat: 18.5991, lng: 73.7621, severity: 2, note: 'One of four Pimpri-Chinchwad corridors with 355 deaths in 2.5 years.' },
  { id: 'nashik-phata', name: 'Nashik Phata (PCMC)', lat: 18.6126, lng: 73.8195, severity: 2, note: 'Old Mumbai–Pune highway flyover junction.' },
  { id: 'hinjewadi-chowk', name: 'Shivaji Chowk, Hinjewadi Ph-1', lat: 18.5913, lng: 73.7389, severity: 1, note: 'IT-park bottleneck with frequent two-wheeler crashes at peak hours.' },
];

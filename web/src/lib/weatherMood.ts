import type { Pulse } from './types';

export interface WeatherMood {
  quip: string;
  emoji: string;
  /** Tailwind gradient classes for the card */
  sky: string;
  tip: string;
  /** true when the sky gradient is dark and needs light text */
  onDark?: boolean;
}

/**
 * Pune-flavoured one-liners for the live weather. Deterministic (no AI call) so the card is instant,
 * and every quip carries a practical tip.
 */
export function weatherMood(p: Pulse | null, hour: number): WeatherMood {
  const w = p?.weather;
  const aqi = p?.air?.aqi ?? null;
  const t = w?.tempC ?? null;
  const type = w?.conditionType ?? '';
  const night = hour >= 19 || hour < 6;

  if (!w) return { quip: 'Asking the sky about Pune’s mood…', emoji: '🛰️', sky: 'from-[#e9ecf2] to-[#f8efcb]', tip: 'Live data loading' };
  if (/THUNDER/.test(type)) return { quip: 'Thunder over the Sahyadris. Even the auto drivers are staying home.', emoji: '⛈️', sky: 'from-[#5b6478] to-[#9aa4b8]', tip: 'Avoid underpasses and the Katraj ghat slope', onDark: true };
  if (w.isRaining || /RAIN|SHOWER|DRIZZLE/.test(type))
    return { quip: 'Roads become rivers, potholes become ponds. Classic Pune monsoon cosplay.', emoji: '🌧️', sky: 'from-[#7c8aa3] to-[#c9d2e0]', tip: 'Two-wheelers: slow down near flyovers and Sinhagad Road' };
  if (aqi !== null && aqi < 40) return { quip: 'The air is a bit masaledaar today. Mask up near the big chowks.', emoji: '😷', sky: 'from-[#d9cbb0] to-[#f4e6c6]', tip: `AQI ${aqi}: limit long rides through traffic` };
  if (t !== null && t >= 34) return { quip: 'Pune’s “pleasant weather” has left the chat. Hydrate like it’s a Sinhagad trek.', emoji: '🥵', sky: 'from-[#ffb36b] to-[#ffe08a]', tip: 'Plan outdoor heritage walks before 11 AM or after 4 PM' };
  if (t !== null && t < 17) return { quip: 'Pune winter mode: monkey caps out, amruttulya in hand.', emoji: '🧣', sky: 'from-[#b9c7e6] to-[#e7ecf7]', tip: 'Early-morning fog on the expressway, drive easy' };
  if (night) return { quip: 'Clear night over the peths. Perfect for a Camp food walk or a Parvati stargaze.', emoji: '🌙', sky: 'from-[#2b3150] to-[#55607f]', tip: 'Stick to well-lit roads, check Safe Route after 10 PM', onDark: true };
  if (/CLOUD/.test(type)) return { quip: 'Cloudy and breezy. Officially chai-and-bhaji weather.', emoji: '⛅', sky: 'from-[#c9d0dc] to-[#eef0f4]', tip: 'Great for a Sinhagad or Parvati climb' };
  return { quip: 'Sunny with a 100% chance of someone saying “Pune used to be cooler”.', emoji: '☀️', sky: 'from-[#ffd36b] to-[#fff1c2]', tip: 'Sunscreen on, carry water, avoid peak-noon queues' };
}

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const RESPONSES: Record<string, unknown> = {
  '/api/config': { mapsKey: '', center: { lat: 18.52, lng: 73.85 } },
  '/api/blackspots': { blackspots: [], sources: [] },
  '/api/reports': { reports: [] },
  '/api/pulse': { weather: { tempC: 31, condition: 'Sunny' }, air: { aqi: 40, category: 'Good' }, briefing: { briefing: 'Calm day in Pune', alerts: [] } },
};

beforeEach(() => {
  window.history.pushState({}, '', '/app');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => new Response(JSON.stringify(RESPONSES[url.split('?')[0]!] ?? {}), { status: 200 })),
  );
});

describe('App', () => {
  it('renders the live pulse and an accessible tab list', async () => {
    render(<App />);
    expect(await screen.findByText('Calm day in Pune')).toBeInTheDocument();
    const tabs = within(screen.getByRole('tablist', { name: 'Sahayatri features' })).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Explore', 'Plan my day', 'Safe Route', 'Fair Fare', 'Report', 'Compare']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('supports arrow-key navigation between tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    const first = screen.getByRole('tab', { name: 'Explore' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Plan my day' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('tabpanel', { name: 'Plan my day' })).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Compare' })).toHaveFocus();
  });

  it('labels every form field in the route planner', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Safe Route' }));
    expect(await screen.findByLabelText('From')).toHaveValue('Swargate, Pune');
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find the safest way/i })).toBeEnabled();
  });

  it('keeps the report button disabled until there is something to send', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: 'Report' }));
    const submit = await screen.findByRole('button', { name: /submit report/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText('What’s happening?'), 'Pothole near Deccan');
    expect(submit).toBeEnabled();
  });
});

describe('Landing', () => {
  it('shows the bilingual brand and links into the co-pilot', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /Sahayatri \(सहयात्री\)/ })).toBeInTheDocument();
    const ctas = screen.getAllByRole('link', { name: /open the co-pilot/i });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach((a) => expect(a).toHaveAttribute('href', '/app'));
  });
});

describe('Preferences', () => {
  it('switches the interface to Marathi and toggles dark mode', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/app');
    render(<App />);
    await user.click(screen.getAllByRole('radio', { name: 'मराठी' })[0]!);
    expect(screen.getByRole('tab', { name: 'सुरक्षित मार्ग' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('mr');
    await user.click(screen.getByRole('button', { name: /dark mode|डार्क मोड/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getAllByRole('radio', { name: 'English' })[0]!);
  });

  it('checks a fair fare and shows what to tell the driver', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        new Response(
          JSON.stringify(
            url === '/api/fare'
              ? { hour: 14, fare: { distanceKm: 3.8, base: 30, distanceCharge: 45, nightCharge: 0, luggageCharge: 0, total: 75, isNight: false, quoted: 250, verdict: 'overcharging', differencePct: 233 }, route: { distanceM: 3800, durationSec: 600, path: [] } }
              : (RESPONSES[url.split('?')[0]!] ?? {}),
          ),
        ),
      ),
    );
    window.history.pushState({}, '', '/app?tab=fare');
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /check the fare/i }));
    expect(await screen.findByText('Overcharging')).toBeInTheDocument();
    expect(screen.getByText(/दादा, मीटरने चला/)).toBeInTheDocument();
  });
});

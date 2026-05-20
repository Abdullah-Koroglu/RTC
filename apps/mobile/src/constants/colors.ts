export const C = {
  bg: '#0a0c14',
  surface: 'rgba(22,27,42,0.82)',
  surfaceHigh: 'rgba(18,22,34,0.98)',
  border: 'rgba(255,255,255,0.08)',
  borderFaint: 'rgba(255,255,255,0.06)',
  blue: '#3B82F6',
  blueDim: 'rgba(59,130,246,0.18)',
  blueBorder: 'rgba(59,130,246,0.3)',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.13)',
  green: '#22C55E',
  text: 'rgba(255,255,255,0.88)',
  textMid: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.38)',
  textDim: 'rgba(255,255,255,0.22)',
  white: '#ffffff',
  tileBg: '#141820',
  overlay: 'rgba(11,13,20,0.95)',
} as const;

export const TILE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'] as const;

export function colorFromLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) & 0xfffffff;
  return TILE_COLORS[hash % TILE_COLORS.length]!;
}

export function getInitials(label: string): string {
  const base = label.replace(/\s*\(.*?\)\s*/g, '').trim();
  return base.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

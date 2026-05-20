import React from 'react';
import Svg, { Line, Path, Polyline, Rect, Circle, Polygon } from 'react-native-svg';

const sb = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

type P = { s?: number; c?: string };

export const IcMic = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1="12" y1="19" x2="12" y2="22" />
    <Line x1="8" y1="22" x2="16" y2="22" />
  </Svg>
);

export const IcMicOff = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Line x1="2" y1="2" x2="22" y2="22" />
    <Path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <Path d="M5 10v2a7 7 0 0 0 12 5" />
    <Path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <Path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <Line x1="12" y1="19" x2="12" y2="22" />
  </Svg>
);

export const IcVideo = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="m22 8-6 4 6 4V8z" />
    <Rect x="2" y="6" width="14" height="12" rx="2" />
  </Svg>
);

export const IcVideoOff = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
    <Path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10z" />
    <Line x1="2" y1="2" x2="22" y2="22" />
  </Svg>
);

export const IcChat = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Svg>
);

export const IcPhone = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L10.68 13.31z" />
    <Line x1="23" y1="1" x2="1" y2="23" />
  </Svg>
);

export const IcUsers = ({ s = 15, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const IcGrid = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Rect x="3" y="3" width="7" height="7" />
    <Rect x="14" y="3" width="7" height="7" />
    <Rect x="14" y="14" width="7" height="7" />
    <Rect x="3" y="14" width="7" height="7" />
  </Svg>
);

export const IcX = ({ s = 14, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const IcSend = ({ s = 16, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Line x1="22" y1="2" x2="11" y2="13" />
    <Polygon points="22 2 15 22 11 13 2 9 22 2" fill={c} stroke="none" />
  </Svg>
);

export const IcLink = ({ s = 15, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
);

export const IcArrowLeft = ({ s = 14, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Line x1="19" y1="12" x2="5" y2="12" />
    <Polyline points="12 19 5 12 12 5" />
  </Svg>
);

export const IcPlus = ({ s = 14, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

export const IcCam = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <Circle cx="12" cy="13" r="4" />
  </Svg>
);

export const IcFlipCamera = ({ s = 20, c = 'currentColor' }: P) => (
  <Svg width={s} height={s} viewBox="0 0 24 24" stroke={c} strokeWidth="2" fill="none" {...sb}>
    <Path d="M20 7h-3a2 2 0 0 1-2-2V2" />
    <Path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" />
    <Path d="M3 15v4a2 2 0 0 0 2 2h7" />
    <Path d="m3 19 3-3-3-3" />
  </Svg>
);

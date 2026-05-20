'use client';

import type { ParticipantState } from '@/hooks/useRoom';

interface Props {
  isHost: boolean;
  isLocked: boolean;
  joinRequests: Array<{ peerId: string; displayName: string }>;
  participants: Map<string, ParticipantState>;
  myPeerId: string;
  onApprove: (peerId: string) => void;
  onDeny: (peerId: string) => void;
  onKick: (peerId: string) => void;
  onLock: (locked: boolean) => void;
  onTransferHost: (peerId: string) => void;
  onClose: () => void;
}

export function HostPanel({
  isHost, isLocked, joinRequests, participants, myPeerId,
  onApprove, onDeny, onKick, onLock, onTransferHost, onClose,
}: Props) {
  if (!isHost) return null;

  const others = [...participants.values()].filter((p) => p.participantId !== myPeerId);

  const S = {
    panel: { position: 'fixed' as const, top: 64, right: 12, width: 300, background: 'rgba(14,18,30,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, fontFamily: 'Inter,sans-serif', zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', overflow: 'hidden' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    title: { color: 'white', fontSize: 13, fontWeight: 700 },
    closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' },
    section: { padding: '12px 16px' },
    sectionTitle: { color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8 },
    row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
    name: { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    btn: (variant: 'green' | 'red' | 'ghost') => ({
      padding: '5px 11px', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
      background: variant === 'green' ? 'rgba(34,197,94,0.2)' : variant === 'red' ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.07)',
      color: variant === 'green' ? '#4ade80' : variant === 'red' ? '#f87171' : 'rgba(255,255,255,0.55)',
    } as React.CSSProperties),
    divider: { height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' },
    lockRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' },
  };

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.title}>Host Paneli</span>
        <button style={S.closeBtn} onClick={onClose}>×</button>
      </div>

      {/* Lock room */}
      <div style={S.lockRow}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Odayı Kilitle</span>
        <button onClick={() => onLock(!isLocked)}
          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', background: isLocked ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.18)', color: isLocked ? '#f87171' : '#93c5fd' }}>
          {isLocked ? '🔒 Kilitli' : '🔓 Açık'}
        </button>
      </div>

      {/* Waiting room requests */}
      {joinRequests.length > 0 && (
        <>
          <div style={S.divider} />
          <div style={S.section}>
            <p style={S.sectionTitle}>Bekleyenler ({joinRequests.length})</p>
            {joinRequests.map((req) => (
              <div key={req.peerId} style={S.row}>
                <span style={S.name}>{req.displayName}</span>
                <button style={S.btn('green')} onClick={() => onApprove(req.peerId)}>Kabul</button>
                <button style={S.btn('red')} onClick={() => onDeny(req.peerId)}>Reddet</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Participants */}
      {others.length > 0 && (
        <>
          <div style={S.divider} />
          <div style={S.section}>
            <p style={S.sectionTitle}>Katılımcılar ({others.length})</p>
            {others.map((p) => (
              <div key={p.participantId} style={S.row}>
                <span style={S.name}>{p.displayName || p.participantId}</span>
                <button style={S.btn('ghost')} onClick={() => onTransferHost(p.participantId)} title="Host yap">👑</button>
                <button style={S.btn('red')} onClick={() => onKick(p.participantId)}>At</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

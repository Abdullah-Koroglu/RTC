'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ContactUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ContactRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  user: ContactUser;
}

type Tab = 'contacts' | 'incoming' | 'outgoing' | 'search';

const S = {
  page: { minHeight: '100vh', background: '#0a0c14', fontFamily: 'Inter, sans-serif', color: 'white', padding: '32px 24px' } as React.CSSProperties,
  card: { background: 'rgba(22,27,42,0.82)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 24 } as React.CSSProperties,
  input: { width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 13px', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif' },
  btn: (variant: 'primary' | 'ghost' | 'danger') => ({
    padding: '9px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    background: variant === 'primary' ? '#3B82F6' : variant === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
    color: variant === 'danger' ? '#f87171' : 'white',
  } as React.CSSProperties),
};

function Avatar({ user, size = 40 }: { user: ContactUser; size?: number }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.displayName} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
  const color = colors[user.displayName.charCodeAt(0) % colors.length]!;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {user.displayName[0]?.toUpperCase()}
    </div>
  );
}

function UserRow({ user, actions }: { user: ContactUser; actions: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <Avatar user={user} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{user.displayName}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, textAlign: 'center', padding: '24px 0', margin: 0 }}>{text}</p>;
}

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('contacts');
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [incoming, setIncoming] = useState<ContactRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ContactRequest[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<ContactUser | null | 'not-found' | 'error'>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [c, inc, out] = await Promise.all([
      fetch('/api/contacts').then((r) => r.json()) as Promise<ContactUser[]>,
      fetch('/api/contacts/requests?direction=incoming').then((r) => r.json()) as Promise<ContactRequest[]>,
      fetch('/api/contacts/requests?direction=outgoing').then((r) => r.json()) as Promise<ContactRequest[]>,
    ]);
    setContacts(Array.isArray(c) ? c : []);
    setIncoming(Array.isArray(inc) ? inc : []);
    setOutgoing(Array.isArray(out) ? out : []);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin?next=/contacts');
    if (status === 'authenticated') void fetchAll();
  }, [status, router, fetchAll]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    setLoading(true);
    setSearchResult(null);
    const res = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail.trim())}`);
    setLoading(false);
    if (res.status === 404) { setSearchResult('not-found'); return; }
    if (!res.ok) { setSearchResult('error'); return; }
    setSearchResult(await res.json() as ContactUser);
  };

  const sendRequest = async (email: string) => {
    setActionLoading(`send-${email}`);
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setActionLoading(null);
    setSearchEmail('');
    setSearchResult(null);
    await fetchAll();
  };

  const respond = async (id: string, action: 'accept' | 'reject') => {
    setActionLoading(id);
    await fetch(`/api/contacts/requests/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    setActionLoading(null);
    await fetchAll();
  };

  const removeContact = async (contactId: string) => {
    setActionLoading(contactId);
    await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
    setActionLoading(null);
    await fetchAll();
  };

  if (status === 'loading') {
    return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>Yükleniyor…</span></div>;
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'contacts', label: 'Rehber', badge: contacts.length },
    { key: 'incoming', label: 'Gelen İstekler', badge: incoming.length },
    { key: 'outgoing', label: 'Gönderilen', badge: outgoing.length },
    { key: 'search', label: 'Kişi Ara' },
  ];

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Rehber</h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>
              {session?.user?.name ?? session?.user?.email}
            </p>
          </div>
          <button onClick={() => router.push('/')} style={S.btn('ghost')}>← Ana Sayfa</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: tab === t.key ? 'rgba(59,130,246,0.25)' : 'transparent', color: tab === t.key ? '#93c5fd' : 'rgba(255,255,255,0.45)' }}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span style={{ marginLeft: 5, background: tab === t.key ? '#3B82F6' : 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={S.card}>
          {/* Contacts tab */}
          {tab === 'contacts' && (
            <>
              {contacts.length === 0 ? <EmptyState text="Henüz rehberinde kimse yok. Kişi Ara sekmesinden eklemeye başla." /> : contacts.map((c) => (
                <UserRow key={c.id} user={c} actions={
                  <button onClick={() => void removeContact(c.id)} disabled={actionLoading === c.id} style={S.btn('danger')}>
                    {actionLoading === c.id ? '…' : 'Çıkar'}
                  </button>
                } />
              ))}
            </>
          )}

          {/* Incoming tab */}
          {tab === 'incoming' && (
            <>
              {incoming.length === 0 ? <EmptyState text="Bekleyen istek yok." /> : incoming.map((r) => (
                <UserRow key={r.id} user={r.user} actions={
                  <>
                    <button onClick={() => void respond(r.id, 'accept')} disabled={actionLoading === r.id} style={S.btn('primary')}>
                      {actionLoading === r.id ? '…' : 'Kabul Et'}
                    </button>
                    <button onClick={() => void respond(r.id, 'reject')} disabled={actionLoading === r.id} style={S.btn('danger')}>
                      Reddet
                    </button>
                  </>
                } />
              ))}
            </>
          )}

          {/* Outgoing tab */}
          {tab === 'outgoing' && (
            <>
              {outgoing.length === 0 ? <EmptyState text="Gönderilen bekleyen istek yok." /> : outgoing.map((r) => (
                <UserRow key={r.id} user={r.user} actions={
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Bekliyor</span>
                } />
              ))}
            </>
          )}

          {/* Search tab */}
          {tab === 'search' && (
            <div>
              <form onSubmit={(e) => void handleSearch(e)} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  type="email"
                  placeholder="Eklemek istediğin kişinin emaili"
                  value={searchEmail}
                  onChange={(e) => { setSearchEmail(e.target.value); setSearchResult(null); }}
                  style={{ ...S.input, flex: 1 }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button type="submit" disabled={loading} style={S.btn('primary')}>
                  {loading ? '…' : 'Ara'}
                </button>
              </form>

              {searchResult === 'not-found' && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center' }}>Bu email adresiyle kayıtlı kullanıcı bulunamadı.</p>
              )}
              {searchResult === 'error' && (
                <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>Bir hata oluştu, tekrar deneyin.</p>
              )}
              {searchResult && searchResult !== 'not-found' && searchResult !== 'error' && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16 }}>
                  <UserRow user={searchResult} actions={
                    <button
                      onClick={() => void sendRequest(searchResult.email)}
                      disabled={actionLoading === `send-${searchResult.email}`}
                      style={S.btn('primary')}
                    >
                      {actionLoading === `send-${searchResult.email}` ? '…' : 'İstek Gönder'}
                    </button>
                  } />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

# Link — Business Analysis

_May 2026_

---

## 1. Ürün Nedir?

**Link**, tarayıcı tabanlı, kurulum gerektirmeyen bir video konferans platformu. Google Meet / Zoom gibi SFU mimarisiyle çalışıyor, ama kendi altyapısında (mediasoup + coturn). Şu an çekirdek ürün tamamlanmış: oda oluşturma, video/ses, chat, ekran paylaşımı, OAuth ile giriş.

---

## 2. Pazar Konumu

### Şu an kim için?

Ürünün mevcut hali **segment belirsiz** — herkes için olabilir ama kimse için optimize edilmemiş. Bu en büyük business risklerinden biri.

### Potansiyel segmentler (tercih sırasıyla)

| Segment | Neden Mantıklı | Zorluk |
|---|---|---|
| **B2B SaaS Ekipleri** | Kalıcı oda URL'i + entegrasyon ihtiyacı var, ödeme alışkanlığı var | Rekabet yüksek |
| **Eğitim (Özel Dersler / Kurslar)** | Beyaz tahta + kayıt + AI transkript direkt fit | Öğretmen edinme maliyeti |
| **Freelancer / Danışman** | Branded link (meet.dis.app/ad), basit, hızlı | Düşük ARPU |
| **Küçük İşletmeler (TR odağı)** | Yerli ürün avantajı, KVKK uyumu | Satış süreci uzun |

**Öneri:** İlk 12 ayda bir segmente odaklan. "Herkes için" pozisyonu ölüm tuzağı.

---

## 3. Rekabet Analizi

### Büyük oyuncular

- **Google Meet / Zoom / Teams**: Kurumsal, derin entegrasyonlar, ama ağır, pahalı, kişisel veri sorunu
- **Whereby**: En yakın rakip — browser-based, branded link modeli, ancak İskandinav fiyatlandırması

### Boşluklar (fırsat alanları)

1. **Türkçe ilk deneyim + yerel destek** — Hiçbir rakip bunu gerçekten yapmıyor
2. **KVKK uyumlu, Türkiye sunuculı** — Kamu, sağlık, eğitim segmentleri bunu arıyor
3. **Geliştirici dostu (API + webhook)** — Whereby/Zoom'un eksik olduğu alan
4. **AI özellikleri makul fiyata** — Transkript + özet Zoom'da Pro plan gerektiriyor

---

## 4. Monetizasyon Modeli

### Mevcut durum
Hiç monetizasyon yok.

### Önerilen katmanlar

```
FREE
├── Max 4 katılımcı
├── 40 dakika limit
├── Link: link.dis.app/xxxx (rastgele)
└── Temel özellikler

PRO — ~$12/ay (kişisel)
├── Sınırsız katılımcı + süre
├── Branded link (link.dis.app/senin-adin)
├── Kayıt (bulut 5GB)
├── AI transkript + özet
└── Toplantı geçmişi

TEAM — ~$9/kişi/ay (min 3 kişi)
├── Pro'nun tamamı
├── Yönetim paneli
├── Ortak branded alan (meet.sirket.com gibi)
├── Analytics (kim ne zaman katıldı, vs.)
└── SSO / SAML

ENTERPRISE — custom
├── On-prem seçeneği
├── KVKK/veri rezidensi garantisi
├── SLA + destek
└── API erişimi
```

### Neden bu model?

- Free katman büyümeyi sağlar (viral loop: toplantı linki paylaşılır → yeni kullanıcı görür)
- Pro'nun CAC'ı çok düşük (self-serve)
- Team → Enterprise yolu var

---

## 5. Büyüme Stratejisi

### Faz 1 — Product-Market Fit (0-6 ay)

**Hedef:** 1.000 aktif kullanıcı, 50 ödeme yapan

- Branded link özelliğini aç (en güçlü viral tetikleyici)
- Bir sektörü seç: freelancer danışmanlar veya özel ders öğretmenleri
- Bu sektörde 5-10 "champion" bul, ürünü onlarla şekillendir
- Ödeme al (Stripe veya İyzico) — ne kadar erken o kadar iyi
- NPS ölç

### Faz 2 — Scale (6-18 ay)

**Hedef:** 10.000 aktif kullanıcı, $30K MRR

- AI özelliklerini ekle (transkript, özet) — upsell kancası
- Takım özellikleri + yönetim paneli
- İlk 3 entegrasyon: Google Calendar, Slack, Zapier
- İçerik pazarlaması: "Zoom yerine neden Link?" gibi SEO odaklı yazılar

### Faz 3 — Expansion (18-36 ay)

**Hedef:** Türkiye'de B2B segment lideri

- KVKK uyum sertifikasyonu → kamu ve sağlık segmentine giriş
- White-label seçeneği (hastane, üniversite kendi markasıyla kullanır)
- API platformu → geliştiriciler kendi ürünlerine Link embed eder
- Mobil uygulama

---

## 6. Özellik Önceliklendirmesi (Business Perspektifi)

Aşağıdakiler tamamen business etkisine göre sıralanmıştır, teknik zorluğa göre değil.

### Tier 1 — Büyümeyi doğrudan etkiler (ilk yapılacaklar)

| Özellik | Neden Öncelikli |
|---|---|
| **Branded / kalıcı oda linki** | Viral loop'un kalbi. Kullanıcı linkini paylaşır, yeni kullanıcı görür |
| **Ödeme sistemi (Stripe/İyzico)** | Gelir olmadan her şey teorik |
| **Toplantı kaydı** | En çok sorulan özellik, Pro upsell kancası |
| **Bekleme odası** | Güven + kontrol. Öğretmen/danışman segmenti için şart |
| **Host kontrolleri** | Mic kapat, at, kilitle — profesyonel kullanım için minimum bar |

### Tier 2 — Retention'ı artırır

| Özellik | Neden |
|---|---|
| **AI transkript + özet** | "Wow" özelliği. Kullanıcı bunu görünce plan yükseltir |
| **Google Calendar entegrasyonu** | Toplantı planlamanın %80'i takvimden geliyor |
| **Ortak not defteri** | Toplantı sırasında değer üretimi → bağımlılık yaratır |
| **Toplantı geçmişi + analytics** | Takım planı için olmazsa olmaz |

### Tier 3 — Farklılaştırır (12 ay sonrası)

| Özellik | Neden |
|---|---|
| **Whiteboard** | Eğitim + tasarım segmenti için güçlü silah |
| **AI gürültü engelleme** | Rakiplerin hepsinde var, olmaz ise dezavantaj |
| **Gerçek zamanlı altyazı** | Erişilebilirlik + uluslararası toplantılar |
| **Breakout room** | Büyük eğitim kurumları için |
| **API + webhook** | Geliştirici kanalı açar |

---

## 7. İş Riskleri

### Kritik riskler

**1. Segment seçilmemesi**
Herkese hitap etmeye çalışmak kaynak israfı. Mesaj bulanıklaşır, SAC (müşteri edinme maliyeti) artar.

**2. Teknik borç → güvenlik**
Todos'ta zaten belirtilmiş: TURN credentials auth'suz, verbose log açık. Bir güvenlik olayı erken aşamada marka itibarını bitirir.

**3. Rakibin fiyat savaşı**
Google Meet ücretsiz. Bunun karşısında "daha ucuz" olmak stratejisi çalışmaz. "Daha iyi bir şey için" konumlanmak şart — AI, KVKK uyumu, Türkçe destek bunlar olabilir.

**4. Infrastructure maliyeti**
mediasoup + coturn her zaman ayakta duran sunucu demek. Ölçeklenince maliyet hızlı büyür. Fiyatlandırmayı buna göre kur.

### Orta seviye riskler

- **Kullanıcı edinme:** Organik büyüme yavaş. Erken aşamada topluluk (Discord, Twitter, LinkedIn) veya bir "dağıtım ortağı" (freelancer platform, eğitim platformu) gerekebilir
- **Churn:** Video konferans araçları çok kolay değiştiriliyor. Sticky özellikler (not defteri, kayıt geçmişi, entegrasyon) olmadan retention düşük kalır
- **Mobil:** Masaüstü tarayıcı odaklı ürün mobil deneyimde zayıf kalabilir. Hedef kitle mobilse bu sorun

---

## 8. Kısa Vadeli Eylem Planı (90 Gün)

```
Ay 1
 ├─ Ödeme altyapısını kur (Stripe / İyzico)
 ├─ Branded link özelliğini yayına al
 └─ Güvenlik açıklarını kapat (todos'taki liste)

Ay 2
 ├─ Bekleme odası + host kontrolleri
 ├─ Toplantı kaydı (basic, indir butonu yeter)
 └─ 10 beta kullanıcı ile birebir görüşme yap

Ay 3
 ├─ NPS ve retention metriklerini kur
 ├─ Hedef segmenti netleştir (verilere bakarak karar ver)
 └─ İlk ödeme yapan kullanıcıyı kazan
```

---

## 9. Başarı Metrikleri

| Metrik | 3 Ay | 6 Ay | 12 Ay |
|---|---|---|---|
| Aktif kullanıcı (aylık) | 500 | 3.000 | 15.000 |
| Ödeme yapan | 20 | 150 | 800 |
| MRR | $240 | $1.800 | $9.600 |
| Ortalama toplantı süresi | >20 dk | >25 dk | >30 dk |
| NPS | >30 | >40 | >50 |

---

## 10. Özet

Link güçlü teknik temele sahip, ancak şu an bir araçtan ibaret — henüz bir ürün değil. Ürün olması için:

1. **Bir müşteri tipi seç** ve onun için optimize et
2. **Para almaya başla** — ücretsiz beta fazını kısa tut
3. **Viral kancayı etkinleştir** — branded link olmadan büyüme organik kalmaz
4. **AI özelliklerini upsell kancası olarak kur** — rakiplerden ayrışmanın en hızlı yolu bu
5. **KVKK uyumunu ön plana çıkar** — Türkiye'de kurumsal segment için bu gerçek bir diferans

Teknik altyapı bu hedeflerin tamamını destekleyecek kapasitede. Eksik olan odak ve sıralama.

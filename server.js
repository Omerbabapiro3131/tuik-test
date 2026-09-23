const express = require('express');
const path = require('path');

const app = express();

const SUPABASE_URL = 'https://qgvabxabrwngegsgzkcn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_21ozdIvq0BA1IWC6m87ESQ_VZBkAymZ';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/toplam-sorgu', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/sayac?id=eq.1&select=toplam`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const data = await response.json();
    return res.json({ toplam: data[0]?.toplam || 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.get('/api/sorgula', async (req, res) => {
  const { isim, ilKodu } = req.query;

  if (!isim) {
    return res.status(400).json({ error: 'Isim gerekli' });
  }

  const formatliIsim = isim.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  const secilenIl = ilKodu || '34';

  const dummy = { Gun: '1', Ay: '1', Yil: '2000', Boy: '170', Kilo: '70' };

  try {
    const fetchSorgu = async (cinsiyet) => {
      const params = new URLSearchParams({
        Ad: formatliIsim,
        ilKodu: secilenIl,
        cinsiyet: String(cinsiyet),
        ...dummy
      });

      const response = await fetch(`https://tuikcocuk.tuik.gov.tr/api/dashboard?${params}`, {
        headers: {
          'Accept': 'application/json, */*',
          'Accept-Language': 'tr-TR,tr;q=0.9',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) return { il: 0, turkiye: 0 };
      const data = await response.json();
      return {
        il: Number(data.ayniIsimdeIlSayi) || 0,
        turkiye: Number(data.ayniIsimdeTurkiyeSayi) || 0
      };
    };

    const [erkek, kadin] = await Promise.all([fetchSorgu(1), fetchSorgu(2)]);

    try {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/sayac?id=eq.1&select=toplam`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const getData = await getRes.json();
      const mevcutToplam = getData[0]?.toplam || 0;

      await fetch(`${SUPABASE_URL}/rest/v1/sayac?id=eq.1`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ toplam: mevcutToplam + 1 })
      });
    } catch (e) {
      console.error('Sayaç güncellenemedi:', e);
    }

    res.json({
      isim: formatliIsim,
      ilToplam: erkek.il + kadin.il,
      turkiyeToplam: erkek.turkiye + kadin.turkiye
    });
  } catch (err) {
    res.status(500).json({ error: 'Hata olustu' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));

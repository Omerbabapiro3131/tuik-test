const express = require('express');
const path = require('path');

const app = express();
app.use(express.static('public'));

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
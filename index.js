import {GoogleGenAI} from '@google/genai';
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gunakan model yang lebih stabil
const model = process.env.MODEL || 'gemini-1.5-flash';
const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error('❌ GEMINI_API_KEY tidak ditemukan di .env file!');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: key,
});

const app = express();
const upload = multer();

const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    }
    
    const systemPrompt = `Anda adalah asisten herbal yang ahli dalam pengobatan tradisional berbasis tumbuhan. 
Anda hanya akan memberikan informasi tentang:
1. Tanaman herbal yang bisa menjadi obat
2. Penyakit yang bisa diobati
3. Cara meracik/membuat ramuan
4. Efek samping dari penggunaan
5. Dosis penggunaan yang aman

Jika pertanyaan di luar topik herbal/obat tradisional, tolong katakan bahwa Anda hanya bisa membantu tentang topik herbal.
Berikan jawaban yang informatif, akurat, dan aman. Ingatkan bahwa ini bukan pengganti konsultasi medis profesional.`;

    // Coba dengan model utama
    let response;
    try {
      response = await ai.interactions.create({
        model: model,
        input: `${systemPrompt}\n\nPertanyaan: ${message}`,
      });
    } catch (error) {
      // Jika model utama error, coba dengan model alternatif
      console.log('⚠️ Model utama error, mencoba model alternatif...');
      try {
        response = await ai.interactions.create({
          model: 'gemini-1.5-pro',
          input: `${systemPrompt}\n\nPertanyaan: ${message}`,
        });
      } catch (error2) {
        // Jika semua model error, gunakan fallback response
        console.error('❌ Semua model error:', error2);
        return res.status(200).json({
          output: `🌿 Maaf, saat ini layanan AI sedang sibuk. Silakan coba lagi dalam beberapa menit.

Tips:
- Coba pertanyaan yang lebih spesifik
- Tanyakan tentang satu jenis herbal saja
- Contoh: "Apa manfaat jahe untuk kesehatan?"`
        });
      }
    }

    res.status(200).json({
      output: response.output_text,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(200).json({ 
      output: `🌿 Maaf, terjadi kesalahan teknis. Silakan coba lagi nanti.

Error: ${error.message || 'Unknown error'}`
    });
  }
});

app.post(
  '/generate-from-document',
  upload.single('file'),
  async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: 'File tidak ditemukan' });
      }
      
      const fileBase64 = req.file.buffer.toString('base64');

      const systemPrompt = `Anda adalah asisten herbal yang ahli dalam pengobatan tradisional berbasis tumbuhan.
Anda akan menganalisis dokumen tentang herbal dan memberikan informasi tentang:
1. Tanaman herbal yang disebutkan
2. Manfaat pengobatan
3. Cara meracik
4. Efek samping
5. Dosis penggunaan`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: model,
          contents: [
            {
              text: `${systemPrompt}\n\nPertanyaan: ${prompt || 'Analisis dokumen herbal ini'}`,
              type: 'text',
            },
            {
              inlineData: {
                data: fileBase64,
                mimeType: req.file.mimetype,
              },
            },
          ],
        });
      } catch (error) {
        console.log('⚠️ Error dengan model utama, mencoba model alternatif...');
        try {
          response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: [
              {
                text: `${systemPrompt}\n\nPertanyaan: ${prompt || 'Analisis dokumen herbal ini'}`,
                type: 'text',
              },
              {
                inlineData: {
                  data: fileBase64,
                  mimeType: req.file.mimetype,
                },
              },
            ],
          });
        } catch (error2) {
          return res.status(200).json({
            output: '🌿 Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.'
          });
        }
      }

      res.status(200).json({
        output: response.text,
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(200).json({ 
        output: '🌿 Maaf, terjadi kesalahan. Silakan coba lagi nanti.'
      });
    }
  }
);

app.listen(port, () => {
  console.log(`🌿 Herbal Chatbot running on http://localhost:${port}`);
  console.log(`🤖 Model: ${model}`);
  console.log(`📁 Directory: ${__dirname}`);
  console.log('💡 Tips: Jika model error, akan otomatis menggunakan fallback');
});
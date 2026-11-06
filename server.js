const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// إعدادات PostgreSQL (تأخذ المتغيرات من Render تلقائياً أو DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// إعدادات Cloudinary الخاصة بك
cloudinary.config({
  cloud_name: 'qdgvybtg',
  api_key: '741197766625241',
  api_secret: 'pXdrEUN8FsdzulZq8_p7Ej9wP-E'
});

const upload = multer({ storage: multer.memoryStorage() });

// إعداد Firebase Admin (يمكنك وضع مفتاح الخدمة كمتظير بيئة FIREBASE_SERVICE_ACCOUNT أو ضبط الملف)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.log("Firebase Admin config note:", e.message);
  }
}

// مسار لجلب الإعلانات النشطة أو جميعها لوحة التحكم
app.api = {};
app.get('/api/listings', async (req, res) => {
  try {
    const { status, search, category } = req.query;
    let query = 'SELECT * FROM listings WHERE 1=1';
    let params = [];
    let idx = 1;

    if (status) {
      query += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category_id = $${idx++}`;
      params.push(category);
    }
    if (search) {
      query += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// مسار إضافة إعلان جديد مع رفع الصورة إلى Cloudinary والحفظ الدائم في PostgreSQL
app.post('/api/listings', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category_id, country_code, user_email } = req.body;
    
    let imageUrl = '';
    if (req.file) {
      let uploadFromBuffer = (req) => {
        return new Promise((resolve, reject) => {
          let stream = cloudinary.uploader.upload_stream((error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          });
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };
      let result = await uploadFromBuffer(req);
      imageUrl = result.secure_url;
    }

    const query = `
      INSERT INTO listings (title, description, price, category_id, country_code, image_url, status, user_email)
      VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
      RETURNING *;
    `;
    const values = [title, description, price, category_id, country_code, imageUrl, user_email || 'guest@user.com'];
    const newListing = await pool.query(query, values);
    
    res.json(newListing.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// مسار لوحة التحكم: تحديث حالة إعلان (موافقة، حذف، رفض)
app.patch('/api/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE listings SET status = $1 WHERE id = $2 RETURNING *;',
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

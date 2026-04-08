const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/images', express.static('images'));

// Create images folder if it doesn't exist
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

const mongoURI = 'mongodb+srv://martevn2023_db_user:1vdPNOg43QQ3Xdpd@education.rqo82ze.mongodb.net/education?retryWrites=true&w=majority';

// Student Schema
const studentSchema = new mongoose.Schema({
    stt:             { type: String, required: true },
    hoTen:           { type: String, required: true },
    lop:             { type: String, required: false },
    ngaySinh:        { type: String, required: true },
    chucVu:          { type: String, required: true },
    queQuan:         { type: String, required: true },
    hocVan:          { type: String, required: true },
    capBac:          { type: String, required: true },
    vanBangImage:    { type: String, required: true },
    ketQuaThamTra:   { type: String, required: true },
    isValid:         { type: Boolean, required: true },
    chiTietThamTra:  { type: String, default: '' },
    aiExtractedName: { type: String, default: '' },
    aiExtractedDob:  { type: String, default: '' },
    camKet:          { type: Boolean, required: true },
    ngayNop:         { type: Date, default: Date.now },
    ngayTiepNhan:    { type: Date, default: Date.now },
    khuVucTiepNhan:  { type: String, default: '' },
    donVi:           { type: String, default: '' },
    gioiTinh:        { type: String, default: '' },
    danToc:          { type: String, default: '' },
    soDienThoai:     { type: String, default: '' }, 
    doiTuong:        { type: String, default: '' }
});

const Student = mongoose.model('Student', studentSchema);

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'vanbang-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working!', timestamp: new Date() });
});

// POST /api/students
app.post('/api/students', upload.single('vanBangImage'), async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.error('❌ MongoDB not connected, readyState:', mongoose.connection.readyState);
            return res.status(503).json({ error: 'Database chưa kết nối. Vui lòng thử lại.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng tải ảnh văn bằng' });
        }

        console.log('📝 Body nhận được:', req.body);
        console.log('📁 File nhận được:', req.file?.filename);

        const {
            stt, hoTen, lop, ngaySinh, chucVu, queQuan,
            hocVan, capBac, ketQuaThamTra, isValid, chiTietThamTra,
            aiExtractedName, aiExtractedDob, camKet,
            region, donVi, gioiTinh, danToc, soDienThoai, doiTuong     
        } = req.body;

        if (!stt || !hoTen || !ngaySinh || !chucVu || !queQuan || !hocVan || !capBac) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc', body: req.body });
        }

        const student = new Student({
            stt,
            hoTen,
            lop,
            ngaySinh,
            chucVu,
            queQuan,
            hocVan,
            capBac,
            vanBangImage:    req.file.filename,
            ketQuaThamTra:   ketQuaThamTra || 'Chưa xác định',
            isValid:         isValid === 'true' || isValid === true,
            chiTietThamTra:  chiTietThamTra || '',
            aiExtractedName: aiExtractedName || '',
            aiExtractedDob:  aiExtractedDob || '',
            camKet:          camKet === 'true' || camKet === true,
            ngayTiepNhan:    new Date(),
            khuVucTiepNhan:  region || '',
            donVi:           donVi || '',
            gioiTinh:        gioiTinh || '',
            danToc:          danToc || '',
            soDienThoai:     soDienThoai || '',  
            doiTuong:        doiTuong || ''
        });

        await student.save();
        console.log('✅ Student saved:', student._id);
        console.log('📞 soDienThoai đã lưu:', student.soDienThoai);
        res.status(201).json({ message: 'Hồ sơ đã được lưu thành công', student });

    } catch (error) {
        console.error('❌ Chi tiết lỗi:', error.message);
        console.error(error.stack);
        res.status(500).json({
            error: 'Lỗi server khi lưu hồ sơ',
            detail: error.message
        });
    }
});

// GET latest student for real-time updates
app.get('/api/students/latest', async (req, res) => {
    try {
        const latestStudent = await Student.findOne().sort({ ngayTiepNhan: -1 });
        res.json({ 
            student: latestStudent,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error fetching latest student:', error.message);
        res.status(500).json({ error: 'Lỗi server khi lấy học viên mới nhất' });
    }
});

// GET all students with pagination
app.get('/api/students', async (req, res) => {
    try {
        console.log('🔍 Fetching all students...');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const students = await Student.find()
            .sort({ ngayTiepNhan: -1 }) // Mới đến cũ (mới nhất lên trước)
            .skip(skip)
            .limit(limit);
            
        // Log để kiểm tra thứ tự
        console.log('📅 Students sorted by ngayTiepNhan:');
        students.forEach((student, index) => {
            console.log(`${index + 1}. ${student.hoTen} - ${student.ngayTiepNhan}`);
        });
            
        const total = await Student.countDocuments();
        const totalPages = Math.ceil(total / limit);
        
        console.log(`✅ Found ${total} students, page ${page} of ${totalPages}`);
        res.json({
            students,
            currentPage: page,
            totalPages,
            total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('❌ Error fetching students:', error.message);
        res.status(500).json({ error: 'Lỗi server khi lấy danh sách học viên', detail: error.message });
    }
});

// GET student by ID
app.get('/api/students/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ error: 'Không tìm thấy học viên' });
        }
        res.json(student);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Lỗi server khi lấy thông tin học viên' });
    }
});

// GET search students by name
app.get('/api/students/search/:name', async (req, res) => {
    try {
        const students = await Student.find({
            hoTen: { $regex: req.params.name, $options: 'i' }
        }).sort({ stt: 1 });
        res.json(students);
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ error: 'Lỗi server khi tìm kiếm học viên' });
    }
});

// Kết nối MongoDB và khởi động server (chỉ một lần)
mongoose.connect(mongoURI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        console.log('📦 Database:', mongoose.connection.name);
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
});
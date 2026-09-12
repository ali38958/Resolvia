const multer = require('multer');
const path = require('path');
const fs = require('fs');

function createImageFilter() {
    return (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF)'));
        }
    };
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// staff upload (generic)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'staff');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// customer profile picture upload
const customerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'customers');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.user.id || req.user.userId;
        const extension = path.extname(file.originalname);
        const uniqueName = `${userId}-${Date.now()}${extension}`;
        cb(null, uniqueName);
    }
});

const customerUpload = multer({
    storage: customerStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// staff profile picture upload
const staffStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'staff');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.user.id || req.user.userId;
        const extension = path.extname(file.originalname);
        const uniqueName = `${userId}-${Date.now()}${extension}`;
        cb(null, uniqueName);
    }
});

const staffUpload = multer({
    storage: staffStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// admin upload
const adminStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'admins');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const adminUpload = multer({
    storage: adminStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// Complaint Manager (Handler) upload
const complaintManagerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'cmanager');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `cmanager-${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const complaintManagerUpload = multer({
    storage: complaintManagerStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// Complaint image upload
const complaintStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'complaints');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const complaintUpload = multer({
    storage: complaintStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

const uploadComplaintImage = complaintUpload; // alias

// Building image upload
const buildingStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'buildings');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const buildingUpload = multer({
    storage: buildingStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// Floor image upload
const floorStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'floors');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const floorUpload = multer({
    storage: floorStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

// Found items upload
const foundStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'assets', 'found');
        ensureDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const foundUpload = multer({
    storage: foundStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: createImageFilter()
});

module.exports = {
    upload,
    customerUpload,
    staffUpload,
    adminUpload,
    complaintManagerUpload,
    complaintUpload,
    uploadComplaintImage,
    buildingUpload,
    floorUpload,
    foundUpload
};

import express from 'express';
import multer from 'multer';
import * as pdfAnalysisService from '../services/pdfAnalysisService.js';

const router = express.Router();

router.use((req, res, next) => {
    console.log(`[pdfRoutes] Request for PDF endpoint: ${req.method} ${req.url}`);
    next();
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/pdf/analyze
 * Body: { query: string }
 * Files: { file: PDF }
 */
router.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        }

        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ success: false, message: 'No query provided' });
        }

        const uploadedFile = req.file;

        if (uploadedFile.mimetype !== 'application/pdf') {
            return res.status(400).json({ success: false, message: 'Only PDF files are supported' });
        }

        console.log(`[pdfRoutes] Analyzing file: ${uploadedFile.originalname}`);

        // Extract text directly from buffer
        const textContent = await pdfAnalysisService.extractTextFromBuffer(uploadedFile.buffer);

        // Analyze with AI
        const analysis = await pdfAnalysisService.analyzePDF(textContent, query);

        res.status(200).json({
            success: true,
            data: {
                filename: uploadedFile.originalname,
                response: analysis
            }
        });

    } catch (error) {
        console.error('[pdfRoutes] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/pdf/extract
 * Files: { file: PDF }
 * Returns: { text: string }
 */
router.post('/extract', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
        }

        const uploadedFile = req.file;

        if (uploadedFile.mimetype !== 'application/pdf') {
            return res.status(400).json({ success: false, message: 'Only PDF files are supported' });
        }

        console.log(`[pdfRoutes] Extracting text from: ${uploadedFile.originalname}`);

        // Extract text directly from buffer
        const textContent = await pdfAnalysisService.extractTextFromBuffer(uploadedFile.buffer);

        res.status(200).json({
            success: true,
            data: {
                text: textContent
            }
        });

    } catch (error) {
        console.error('[pdfRoutes] Extraction Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;

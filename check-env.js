import dotenv from 'dotenv';
dotenv.config();
console.log('GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID);
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'EXISTS' : 'MISSING');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'EXISTS' : 'MISSING');
console.log('VITE_GEMINI_API_KEY:', process.env.VITE_GEMINI_API_KEY ? 'EXISTS' : 'MISSING');

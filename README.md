# VERSANT English Language Testing System

A comprehensive web-based English language testing platform with role-based access control, featuring practice tests, online exams, and advanced analytics.

## 🚀 Features

### Role-Based Access Control
- **Super Admin**: Complete system administration
- **Campus Admin**: Campus-level oversight and management
- **Course Admin**: Course-level student management
- **Student**: Test taking and progress tracking

### Test Modules
- **Listening**: Audio comprehension tests
- **Speaking**: Pronunciation and fluency tests
- **Reading**: Text comprehension tests
- **Writing**: Written expression tests

### Difficulty Levels
- **Beginner**: Basic proficiency
- **Intermediate**: Moderate proficiency
- **Advanced**: High proficiency

### Core Features
- Practice tests and online exams
- Real-time audio recording and transcription
- Progress tracking across modules and levels
- Comprehensive analytics and reporting
- Bulk user and test management
- AWS S3 integration for file storage

## 🛠️ Tech Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: MongoDB
- **Authentication**: JWT
- **File Storage**: AWS S3
- **Audio Processing**: OpenAI Whisper API
- **Testing**: pytest

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Charts**: Chart.js
- **Icons**: Lucide React

## 📁 Project Structure

```
VERSANT WITH MONGO DB/
├── backend/                 # Flask backend
├── frontend/               # React frontend
├── shared/                 # Shared utilities
├── docker/                 # Docker configuration
├── deployment/             # Deployment scripts
└── docs/                   # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB
- AWS S3 Account

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Environment Variables

Create `.env` files in both backend and frontend directories:

### Backend (.env)
```
# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key

# AWS Configuration
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name

# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key

# CORS Configuration (optional)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env)
```
# API Configuration
VITE_API_URL=http://localhost:5000

# Server Configuration (optional)
VITE_PORT=3000

# App Configuration (optional)
VITE_APP_NAME=VERSANT
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh token
- `POST /auth/forgot-password` - Password recovery
- `POST /auth/reset-password` - Password reset

### Super Admin Endpoints
- `POST /superadmin/users` - Create user
- `GET /superadmin/users` - List all users
- `POST /superadmin/tests` - Create test
- `GET /superadmin/tests` - List all tests
- `POST /superadmin/online-exams` - Create online exam

### Campus Admin Endpoints
- `GET /campus-admin/reports/student-progress` - Student progress reports
- `GET /campus-admin/analytics/overview` - Campus analytics

### Course Admin Endpoints
- `GET /course-admin/reports/student-progress` - Student progress
- `GET /course-admin/analytics/overview` - Course analytics

### Student Endpoints
- `GET /student/tests` - Available tests
- `POST /student/tests/<test_id>/start` - Start test
- `POST /student/tests/<test_id>/submit` - Submit test

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🐳 Docker Deployment

```bash
docker-compose up -d
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Support

For support, email support@versant.com or create an issue in the repository. 
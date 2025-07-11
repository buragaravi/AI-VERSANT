# VERSANT English Language Testing System

A comprehensive web-based English language testing platform with role-based access control, featuring practice tests, online exams, real-time communication, and advanced analytics.

## 🚀 Features

### Role-Based Access Control
- **Super Admin**: Complete system administration with user, campus, course, and batch management
- **Campus Admin**: Campus-level oversight, student management, and analytics
- **Course Admin**: Course-level student management and progress tracking
- **Student**: Test taking, practice modules, and progress tracking

### Test Modules
- **Listening**: Audio comprehension tests with real-time audio generation
- **Speaking**: Pronunciation and fluency tests with audio recording
- **Reading**: Text comprehension tests
- **Writing**: Written expression tests
- **Grammar**: Structured grammar practice with categories
- **Vocabulary**: Word knowledge and usage tests

### Difficulty Levels
- **Beginner**: Basic proficiency (Level 1-3)
- **Intermediate**: Moderate proficiency (Level 4-6)
- **Advanced**: High proficiency (Level 7-9)

### Core Features
- **Real-time Communication**: Socket.IO integration for live updates
- **Practice Tests & Online Exams**: Comprehensive testing system
- **Audio Processing**: Real-time audio recording, transcription, and generation
- **Progress Tracking**: Detailed analytics across modules and levels
- **Bulk Operations**: CSV/Excel import for users, tests, and data management
- **AWS S3 Integration**: Secure file storage for audio and documents
- **Anti-cheating System**: Tab switching detection and exam monitoring
- **Email Notifications**: Automated credential sharing and test notifications
- **Advanced Analytics**: Comprehensive reporting and dashboard analytics

## 🛠️ Tech Stack

### Backend
- **Framework**: Flask 2.2.2 (Python)
- **Database**: MongoDB with PyMongo
- **Authentication**: JWT with Flask-JWT-Extended
- **Real-time**: Socket.IO with Flask-SocketIO
- **File Storage**: AWS S3 with boto3
- **Audio Processing**: OpenAI Whisper API, gTTS, PyDub
- **Email Service**: Brevo (formerly Sendinblue)
- **Testing**: pytest
- **Production**: Gunicorn with eventlet

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 4.5.0
- **Styling**: Tailwind CSS 3.3.5
- **State Management**: React Context + Hooks
- **Real-time**: Socket.IO Client
- **Charts**: Chart.js 4.4.0 with react-chartjs-2
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **File Upload**: React Dropzone
- **Animations**: Framer Motion
- **Data Processing**: PapaParse, XLSX

## 📁 Project Structure

```
AI VERSANT DIPLOYMENT FILE/
├── backend/                    # Flask backend
│   ├── config/                # Configuration files
│   │   ├── aws_config.py      # AWS S3 configuration
│   │   ├── database.py        # Database configuration
│   │   ├── database_cloud.py  # Cloud-optimized database config
│   │   └── constants.py       # System constants
│   ├── routes/                # API route blueprints
│   │   ├── auth.py           # Authentication routes
│   │   ├── superadmin.py     # Super admin routes
│   │   ├── campus_admin.py   # Campus admin routes
│   │   ├── course_admin.py   # Course admin routes
│   │   ├── student.py        # Student routes
│   │   └── ...               # Other route modules
│   ├── utils/                 # Utility functions
│   │   ├── audio_generator.py # Audio processing utilities
│   │   └── email_service.py   # Email service
│   ├── templates/             # Email templates
│   ├── main.py               # Main application entry
│   ├── main_with_socketio.py # Socket.IO enabled entry
│   ├── wsgi.py               # Production WSGI entry
│   └── requirements.txt      # Python dependencies
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API services
│   │   └── main.jsx         # Application entry
│   ├── package.json         # Node.js dependencies
│   └── vite.config.js       # Vite configuration
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- MongoDB (local or Atlas)
- AWS S3 Account
- OpenAI API Key (optional)

### Backend Setup

#### Windows Installation
```bash
cd backend
# Use provided installation scripts
install_windows.bat
# OR
.\install_windows.ps1
```

#### Linux/macOS Installation
```bash
cd backend
# Install system dependencies
sudo apt-get install portaudio19-dev python3-pyaudio  # Ubuntu/Debian
brew install portaudio  # macOS

# Install Python packages
pip install -r requirements.txt
```

#### Environment Configuration
Create `.env` file in backend directory:
```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/versant_db?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET_KEY=your-secure-jwt-secret-key

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key

# Email Configuration
BREVO_API_KEY=your-brevo-api-key

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend-domain.vercel.app

# Server Configuration
FLASK_DEBUG=True
PORT=5000
```

#### Start Backend
```bash
# Development mode
python main.py

# Production mode
python start.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Create `.env` file in frontend directory:
```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_SOCKET_IO_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME=VERSANT
VITE_PORT=3000
```

## 🔧 Environment Variables

### Backend (.env)
```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/versant_db?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET_KEY=your-secure-jwt-secret-key

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key

# Email Configuration
BREVO_API_KEY=your-brevo-api-key

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend-domain.vercel.app

# Server Configuration
FLASK_DEBUG=True
PORT=5000
```

### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_SOCKET_IO_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME=VERSANT
VITE_PORT=3000
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
- `POST /superadmin/batches` - Create batch
- `GET /superadmin/batches` - List batches
- `POST /superadmin/campuses` - Create campus
- `GET /superadmin/campuses` - List campuses

### Campus Admin Endpoints
- `GET /campus-admin/reports/student-progress` - Student progress reports
- `GET /campus-admin/analytics/overview` - Campus analytics
- `GET /campus-admin/students` - List campus students
- `POST /campus-admin/batches` - Manage campus batches

### Course Admin Endpoints
- `GET /course-admin/reports/student-progress` - Student progress
- `GET /course-admin/analytics/overview` - Course analytics
- `GET /course-admin/students` - List course students

### Student Endpoints
- `GET /student/tests` - Available tests
- `POST /student/tests/<test_id>/start` - Start test
- `POST /student/tests/<test_id>/submit` - Submit test
- `GET /student/practice-modules` - Practice modules
- `GET /student/progress` - Progress tracking

### Real-time Events (Socket.IO)
- `join` - Join student room for real-time updates
- `module_access_changed` - Module access updates
- `test_notification` - Test notifications

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

### Deployment Testing
```bash
cd backend
python test_deployment.py
```

## 🚀 Deployment

### Render Deployment (Backend)
1. Follow the [Render Deployment Guide](backend/RENDER_DEPLOYMENT_GUIDE.md)
2. Set up MongoDB Atlas with proper SSL configuration
3. Configure environment variables in Render
4. Use `main_with_socketio.py` for Socket.IO support

### Vercel Deployment (Frontend)
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with build command: `npm run build`

### Production Configuration
- Use `requirements_with_socketio.txt` for Socket.IO support
- Configure Gunicorn with `gunicorn_config.py`
- Set up proper SSL/TLS certificates
- Enable MongoDB Atlas security features

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Anti-cheating system for online exams
- Secure file upload with validation
- CORS configuration for cross-origin requests
- Environment variable protection
- MongoDB connection with SSL/TLS

## 📈 Analytics & Reporting

- Student progress tracking across modules
- Campus and course-level analytics
- Test performance metrics
- Real-time dashboard updates
- Export functionality (CSV/Excel)
- Comprehensive reporting system

## 🎵 Audio Features

- Real-time audio recording for speaking tests
- Text-to-speech generation for listening tests
- Audio transcription using OpenAI Whisper
- Multiple accent and speed options
- Audio file management with AWS S3

## 📧 Email System

- Automated credential sharing
- Test notifications
- Password reset functionality
- HTML email templates
- Brevo (Sendinblue) integration

## 🛠️ Development

### Code Structure
- Modular blueprint architecture
- Separation of concerns
- Comprehensive error handling
- Logging and debugging support
- Type hints and documentation

### Database Design
- MongoDB collections for users, tests, results
- Proper indexing for performance
- Data validation and sanitization
- Backup and recovery procedures

### API Design
- RESTful endpoints
- Consistent response format
- Proper HTTP status codes
- Comprehensive error messages
- API versioning support

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📞 Support

For support, email support@versant.com or create an issue in the repository.

## 🔗 Related Documentation

- [Installation Guide](backend/INSTALLATION_GUIDE.md)
- [Render Deployment Guide](backend/RENDER_DEPLOYMENT_GUIDE.md)
- [API Documentation](backend/routes/)
- [Frontend Components](frontend/src/components/) 
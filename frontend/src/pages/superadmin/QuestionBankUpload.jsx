import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import MCQUpload from './MCQUpload';

const MCQ_MODULES = [
  { 
    id: 'GRAMMAR', 
    name: 'Grammar', 
    color: 'from-blue-500 to-blue-600',
    icon: '📚',
    description: 'Upload grammar questions with categories like Noun, Pronoun, etc.'
  },
  { 
    id: 'VOCABULARY', 
    name: 'Vocabulary', 
    color: 'from-green-500 to-green-600',
    icon: '📖',
    description: 'Upload vocabulary questions with difficulty levels'
  },
  { 
    id: 'READING', 
    name: 'Reading', 
    color: 'from-purple-500 to-purple-600',
    icon: '📖',
    description: 'Upload reading comprehension questions'
  },
];

const QuestionBankUpload = () => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [levelId, setLevelId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [modules, setModules] = useState([]);
  const [levels, setLevels] = useState([]);
  const [currentStep, setCurrentStep] = useState('modules');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileQuestions, setFileQuestions] = useState([]);

  useEffect(() => {
    fetchModules();
    fetchUploadedFiles();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      fetchLevels();
    }
  }, [selectedModule]);

  const fetchModules = async () => {
    try {
      const response = await api.get('/test-management/get-test-data');
      if (response.data.success) {
        setModules(response.data.data.modules);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to fetch modules');
    }
  };

  const fetchLevels = async () => {
      try {
      const response = await api.get('/test-management/get-test-data');
      if (response.data.success) {
        if (selectedModule === 'GRAMMAR') {
          setLevels(response.data.data.grammar_categories);
        } else {
          setLevels(response.data.data.levels.filter(level => 
            level.id.startsWith(selectedModule)
          ));
        }
      }
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast.error('Failed to fetch levels');
        }
  };

  const fetchUploadedFiles = async () => {
    try {
      const response = await api.get('/test-management/uploaded-files');
      if (response.data.success) {
        setUploadedFiles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      // Don't show error toast as this might be a new endpoint
    }
  };

  const fetchFileQuestions = async (fileId) => {
    try {
      const response = await api.get(`/test-management/uploaded-files/${fileId}/questions`);
      if (response.data.success) {
        setFileQuestions(response.data.data);
        setShowFileDetails(true);
      }
    } catch (error) {
      console.error('Error fetching file questions:', error);
      toast.error('Failed to fetch file questions');
    }
  };

  const handleModuleSelect = (module) => {
    setSelectedModule(module.id);
    setCurrentStep('levels');
  };

  const handleViewQuestions = (file) => {
    setSelectedFile(file);
    setCurrentStep('questions');
    fetchFileQuestions(file._id);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setCurrentStep('modules');
    setQuestions([]);
    setLevelId('');
    setShowFileDetails(false);
    setSelectedFile(null);
  };

  const handleUploadSuccess = () => {
    fetchUploadedFiles();
    setCurrentStep('modules');
    setSelectedModule(null);
    setQuestions([]);
    setLevelId('');
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Question: 'What is a noun?',
        A: 'A word that describes an action',
        B: 'A word that names a person, place, thing, or idea',
        C: 'A word that describes a quality',
        D: 'A word that connects words',
        Answer: 'B'
      },
      {
        Question: 'Which of the following is a pronoun?',
        A: 'Happy',
        B: 'Quickly',
        C: 'He',
        D: 'Running',
        Answer: 'C'
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedModule}_MCQ_Template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderModuleCards = () => (
    <div className="min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Question Bank Upload
              </h1>
              <p className="text-gray-600">
                Upload questions for different modules and manage your question bank
              </p>
            </div>

            {/* Module Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {MCQ_MODULES.map((module, index) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200"
                  onClick={() => handleModuleSelect(module)}
                >
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
                        module.id === 'GRAMMAR' ? 'bg-red-100 text-red-600' :
                        module.id === 'VOCABULARY' ? 'bg-blue-100 text-blue-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {module.icon}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      {module.name}
                    </h3>
                    <p className="text-gray-600 text-base mb-6 leading-relaxed">
                      {module.description}
                    </p>
                    <div className="flex items-center text-blue-600 font-semibold text-base">
                      <span>Upload Questions</span>
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Uploaded Files Section */}
            {uploadedFiles.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Recently Uploaded Files</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {uploadedFiles.slice(0, 6).map((file) => (
                    <div key={file._id} className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800 text-lg">{file.module_name}</h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{file.level_name}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-4 space-y-1">
                        <p><strong>File:</strong> {file.filename}</p>
                        <p><strong>Questions:</strong> {file.question_count}</p>
                        <p><strong>Uploaded:</strong> {new Date(file.uploaded_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleViewQuestions(file)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Questions
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  const renderLevelsSection = () => (
    <div className="min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={handleBackToModules}
                className="flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-4 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Modules
              </button>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Select Level for {selectedModule}
              </h1>
              <p className="text-gray-600">
                Choose a level to upload questions for {selectedModule}
              </p>
            </div>

            {/* Levels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {levels.map((level, index) => (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200"
                  onClick={() => {
                    setLevelId(level.id);
                    setCurrentStep('upload');
                  }}
                >
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="w-16 h-16 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                        {level.id.split('_')[1] || level.id}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      {level.name}
                    </h3>
                    <p className="text-gray-600 text-base mb-6 leading-relaxed">
                      Upload questions for {level.name} level
                    </p>
                    <div className="flex items-center text-blue-600 font-semibold text-base">
                      <span>Upload Questions</span>
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  const renderUploadSection = () => (
    <div className="min-h-screen bg-gray-100">
      <SuperAdminSidebar />
      <div className="ml-64">
        <Header />
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => setCurrentStep('levels')}
                className="flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-4 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Levels
              </button>
              
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Upload MCQs for {selectedModule} - {levels.find(l => l.id === levelId)?.name || 'Level'}
              </h1>
              <p className="text-gray-600">
                Upload your CSV or XLSX file with MCQ questions for {levels.find(l => l.id === levelId)?.name || 'selected level'}
              </p>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl shadow-lg p-10 mb-8">
                            {/* Level Selection */}
              <div className="mb-8">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Select Level
                </label>
                <select
                  value={levelId}
                  onChange={(e) => setLevelId(e.target.value)}
                  className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                >
                  <option value="">Choose a level...</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Download */}
              <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2 text-lg">Download Template</h3>
                    <p className="text-base text-blue-600">
                      Download the CSV template to see the exact format required for upload
                    </p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base"
                  >
                    Download Template
                  </button>
                </div>
              </div>

              {/* MCQ Upload Component */}
              <MCQUpload
                questions={questions}
                setQuestions={setQuestions}
                onNext={handleUploadSuccess}
                onBack={handleBackToModules}
                moduleName={selectedModule}
                levelId={levelId}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );

  const renderFileDetails = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              File Questions - {selectedFile?.filename}
            </h2>
            <button
              onClick={() => {
                setShowFileDetails(false);
                setCurrentStep('modules');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <p><strong>Module:</strong> {selectedFile?.module_name} | <strong>Level:</strong> {selectedFile?.level_name}</p>
            <p><strong>Uploaded:</strong> {selectedFile?.uploaded_at ? new Date(selectedFile.uploaded_at).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {fileQuestions.map((question, index) => (
            <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">
                Q{index + 1}: {question.question}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="p-2 bg-gray-50 rounded">A: {question.optionA}</div>
                <div className="p-2 bg-gray-50 rounded">B: {question.optionB}</div>
                <div className="p-2 bg-gray-50 rounded">C: {question.optionC}</div>
                <div className="p-2 bg-gray-50 rounded">D: {question.optionD}</div>
              </div>
              <div className="mt-3 text-sm">
                <span className="font-medium text-green-600">Answer: {question.answer}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {currentStep === 'modules' && renderModuleCards()}
      {currentStep === 'levels' && renderLevelsSection()}
      {currentStep === 'upload' && renderUploadSection()}
      {currentStep === 'questions' && renderFileDetails()}
    </div>
  );
};

export default QuestionBankUpload; 
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
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [modules, setModules] = useState([]);
  const [levels, setLevels] = useState([]);
  const [currentStep, setCurrentStep] = useState('modules');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileQuestions, setFileQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

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

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    setCurrentStep('upload');
  };

  const handleViewQuestions = (file) => {
    setSelectedFile(file);
    setCurrentStep('questions');
    fetchFileQuestions(file._id);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setSelectedLevel(null);
    setCurrentStep('modules');
    setQuestions([]);
    setShowFileDetails(false);
    setSelectedFile(null);
    setEditingQuestion(null);
    setShowAddQuestion(false);
  };

  const handleBackToLevels = () => {
    setSelectedLevel(null);
    setCurrentStep('levels');
    setQuestions([]);
  };

  const handleUploadSuccess = () => {
    fetchUploadedFiles();
    setCurrentStep('modules');
    setSelectedModule(null);
    setSelectedLevel(null);
    setQuestions([]);
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

  const handleDeleteQuestion = async (questionId) => {
    try {
      await api.delete(`/test-management/questions/${questionId}`);
      toast.success('Question deleted successfully');
      fetchFileQuestions(selectedFile._id);
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
  };

  const handleSaveEdit = async (questionData) => {
    try {
      await api.put(`/test-management/questions/${editingQuestion._id}`, questionData);
      toast.success('Question updated successfully');
      setEditingQuestion(null);
      fetchFileQuestions(selectedFile._id);
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('Failed to update question');
    }
  };

  const handleAddQuestion = async (questionData) => {
    try {
      await api.post(`/test-management/uploaded-files/${selectedFile._id}/questions`, questionData);
      toast.success('Question added successfully');
      setShowAddQuestion(false);
      fetchFileQuestions(selectedFile._id);
    } catch (error) {
      console.error('Error adding question:', error);
      toast.error('Failed to add question');
    }
  };

  const renderModuleCards = () => (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <div className="flex-1">
        <Header />
        <main className="px-4 mt-6">
        {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
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
        </main>
      </div>
          </div>
  );

  const renderLevelsSection = () => (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <div className="flex-1">
        <Header />
        <main className="px-4 mt-6">
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
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
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
                onClick={() => handleLevelSelect(level)}
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
        </main>
      </div>
              </div>
  );

  const renderUploadSection = () => (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <div className="flex-1">
        <Header />
        <main className="px-4 mt-6">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBackToLevels}
              className="flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-4 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Levels
            </button>
            
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Upload MCQs for {selectedModule} - {selectedLevel?.name}
            </h1>
            <p className="text-gray-600">
              Upload your CSV or XLSX file with MCQ questions for {selectedLevel?.name}
            </p>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-2xl shadow-lg p-10 mb-8">
            {/* Template Download - Moved to corner */}
            <div className="flex justify-end mb-8">
            <button
                onClick={downloadTemplate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base flex items-center"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Template
            </button>
          </div>

          {/* MCQ Upload Component */}
          <MCQUpload
            questions={questions}
            setQuestions={setQuestions}
            onNext={handleUploadSuccess}
            onBack={handleBackToModules}
            moduleName={selectedModule}
              levelId={selectedLevel?.id}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
        </main>
      </div>
    </div>
  );

  const renderFileDetails = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
            <h2 className="text-2xl font-bold text-gray-800">
              File Questions - {selectedFile?.filename}
            </h2>
              <div className="text-sm text-gray-600 mt-2">
                <p><strong>Module:</strong> {selectedFile?.module_name} | <strong>Level:</strong> {selectedFile?.level_name}</p>
                <p><strong>Uploaded:</strong> {selectedFile?.uploaded_at ? new Date(selectedFile.uploaded_at).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddQuestion(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Question
              </button>
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
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {fileQuestions.map((question, index) => (
            <div key={index} className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
              {editingQuestion && editingQuestion._id === question._id ? (
                <EditQuestionForm 
                  question={question} 
                  onSave={handleSaveEdit} 
                  onCancel={() => setEditingQuestion(null)}
                />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 text-lg">
                Q{index + 1}: {question.question}
              </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="p-3 bg-white rounded border">A: {question.optionA}</div>
                    <div className="p-3 bg-white rounded border">B: {question.optionB}</div>
                    <div className="p-3 bg-white rounded border">C: {question.optionC}</div>
                    <div className="p-3 bg-white rounded border">D: {question.optionD}</div>
              </div>
              <div className="mt-3 text-sm">
                <span className="font-medium text-green-600">Answer: {question.answer}</span>
              </div>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>
    );

  const renderAddQuestionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Add New Question</h2>
            <button
              onClick={() => setShowAddQuestion(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <AddQuestionForm 
          onSave={handleAddQuestion} 
          onCancel={() => setShowAddQuestion(false)}
        />
      </div>
    </div>
  );

  return (
    <div>
      {currentStep === 'modules' && renderModuleCards()}
      {currentStep === 'levels' && renderLevelsSection()}
      {currentStep === 'upload' && renderUploadSection()}
      {currentStep === 'questions' && renderFileDetails()}
      {showAddQuestion && renderAddQuestionModal()}
    </div>
  );
};

// Edit Question Form Component
const EditQuestionForm = ({ question, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    question: question.question,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    answer: question.answer
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
        <textarea
          value={formData.question}
          onChange={(e) => setFormData({...formData, question: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option A</label>
          <input
            type="text"
            value={formData.optionA}
            onChange={(e) => setFormData({...formData, optionA: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option B</label>
          <input
            type="text"
            value={formData.optionB}
            onChange={(e) => setFormData({...formData, optionB: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option C</label>
          <input
            type="text"
            value={formData.optionC}
            onChange={(e) => setFormData({...formData, optionC: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option D</label>
          <input
            type="text"
            value={formData.optionD}
            onChange={(e) => setFormData({...formData, optionD: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
        <select
          value={formData.answer}
          onChange={(e) => setFormData({...formData, answer: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select answer</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

// Add Question Form Component
const AddQuestionForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    answer: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
        <textarea
          value={formData.question}
          onChange={(e) => setFormData({...formData, question: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option A</label>
          <input
            type="text"
            value={formData.optionA}
            onChange={(e) => setFormData({...formData, optionA: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option B</label>
          <input
            type="text"
            value={formData.optionB}
            onChange={(e) => setFormData({...formData, optionB: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option C</label>
          <input
            type="text"
            value={formData.optionC}
            onChange={(e) => setFormData({...formData, optionC: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Option D</label>
          <input
            type="text"
            value={formData.optionD}
            onChange={(e) => setFormData({...formData, optionD: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
        <select
          value={formData.answer}
          onChange={(e) => setFormData({...formData, answer: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Select answer</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Add Question
        </button>
      </div>
    </form>
  );
};

export default QuestionBankUpload; 
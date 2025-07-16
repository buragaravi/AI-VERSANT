import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateMap, setDuplicateMap] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchModules();
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension !== 'csv' && fileExtension !== 'xlsx') {
      toast.error('Please upload a CSV or XLSX file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let parsedQuestions = [];
        
        if (fileExtension === 'csv' || file.type === 'text/csv') {
          const result = Papa.parse(e.target.result, { 
            header: true, 
            skipEmptyLines: true, 
            trimHeaders: true, 
            trimValues: true 
          });
          
          if (result.data.length === 0) {
            throw new Error('No data found in CSV file.');
          }
          
          parsedQuestions = result.data.map(row => ({
            question: row.question || row.Question || '',
            optionA: row.optionA || row.OptionA || row.A || '',
            optionB: row.optionB || row.OptionB || row.B || '',
            optionC: row.optionC || row.OptionC || row.C || '',
            optionD: row.optionD || row.OptionD || row.D || '',
            answer: row.answer || row.Answer || '',
            instructions: row.instructions || row.Instructions || ''
          }));
        } else {
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (data.length < 2) {
            throw new Error('No data found in XLSX file.');
          }
          
          const headers = data[0];
          const questionIndex = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes('question')
          );
          const optionAIndex = headers.findIndex(h => 
            h && (h.toString().toLowerCase().includes('a') || h.toString().toLowerCase().includes('optiona'))
          );
          const optionBIndex = headers.findIndex(h => 
            h && (h.toString().toLowerCase().includes('b') || h.toString().toLowerCase().includes('optionb'))
          );
          const optionCIndex = headers.findIndex(h => 
            h && (h.toString().toLowerCase().includes('c') || h.toString().toLowerCase().includes('optionc'))
          );
          const optionDIndex = headers.findIndex(h => 
            h && (h.toString().toLowerCase().includes('d') || h.toString().toLowerCase().includes('optiond'))
          );
          const answerIndex = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes('answer')
          );
          const instructionsIndex = headers.findIndex(h => 
            h && h.toString().toLowerCase().includes('instruction')
          );
          
          parsedQuestions = data.slice(1).map(row => ({
            question: row[questionIndex] || '',
            optionA: row[optionAIndex] || '',
            optionB: row[optionBIndex] || '',
            optionC: row[optionCIndex] || '',
            optionD: row[optionDIndex] || '',
            answer: row[answerIndex] || '',
            instructions: row[instructionsIndex] || ''
          }));
        }

        // Validate questions
        const validQuestions = parsedQuestions.filter(q => 
          q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.answer
        );

        if (validQuestions.length === 0) {
          throw new Error('No valid questions found. Please check your file format.');
        }

        setQuestions(validQuestions);
        setShowPreview(true);
        toast.success(`Successfully parsed ${validQuestions.length} questions`);
        
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error(`Error parsing file: ${error.message}`);
      }
    };
    
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!levelId) {
      toast.error('Please select a level');
      return;
    }

    if (questions.length === 0) {
      toast.error('No questions to upload');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        module_id: selectedModule,
        level_id: levelId,
        questions: questions.map(q => ({
          question: q.question,
          options: [q.optionA, q.optionB, q.optionC, q.optionD],
          answer: q.answer,
          instructions: q.instructions
        }))
      };

      const response = await api.post('/test-management/module-question-bank/upload', payload);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setQuestions([]);
        setShowPreview(false);
        setLevelId('');
        setCurrentStep('modules');
        setSelectedModule(null);
      } else {
        toast.error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = (module) => {
    setSelectedModule(module.id);
    setCurrentStep('upload');
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setCurrentStep('modules');
    setQuestions([]);
    setShowPreview(false);
    setLevelId('');
  };

  if (currentStep === 'modules') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Bulk MCQ Upload
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload multiple choice questions for different modules. Select a module to get started.
            </p>
          </div>

          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {MCQ_MODULES.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                onClick={() => handleModuleSelect(module)}
              >
                <div className={`h-3 bg-gradient-to-r ${module.color} rounded-t-2xl`}></div>
                <div className="p-8">
                  <div className="text-4xl mb-4">{module.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    {module.name}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {module.description}
                  </p>
                  <div className="mt-6 flex items-center text-blue-600 font-semibold">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
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
            Upload MCQs for {selectedModule}
          </h1>
          <p className="text-gray-600">
            Upload your CSV or XLSX file with MCQ questions
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {/* Level Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Level
            </label>
            <select
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Download Template</h3>
                <p className="text-sm text-blue-600">
                  Download the CSV template to see the exact format required for upload
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Download Template
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload File (CSV/XLSX)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Choose a file or drag it here
                </p>
                <p className="text-sm text-gray-500">
                  Supports CSV and XLSX files with columns: Question, A, B, C, D, Answer
                </p>
              </label>
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && questions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Preview ({questions.length} questions)
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Hide Preview
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {questions.slice(0, 3).map((q, index) => (
                  <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                    <p className="font-medium text-gray-800 mb-2">
                      Q{index + 1}: {q.question}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>A: {q.optionA}</div>
                      <div>B: {q.optionB}</div>
                      <div>C: {q.optionC}</div>
                      <div>D: {q.optionD}</div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-green-600">Answer: {q.answer}</span>
                    </div>
                  </div>
                ))}
                {questions.length > 3 && (
                  <div className="p-4 text-center text-gray-500">
                    ... and {questions.length - 3} more questions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Button */}
          {questions.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={loading || !levelId}
                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  loading || !levelId
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  `Upload ${questions.length} Questions`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionBankUpload; 
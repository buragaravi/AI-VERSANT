import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, ChevronRight, ChevronDown, Upload as UploadIcon } from 'lucide-react';
import api from '../../services/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import Header from '../../components/common/Header';

const grammarLevels = [
  { id: 'noun', name: 'Noun' },
  { id: 'verb', name: 'Verb' },
  { id: 'adjective', name: 'Adjective' },
  { id: 'adverb', name: 'Adverb' },
  { id: 'preposition', name: 'Preposition' },
  { id: 'conjunction', name: 'Conjunction' },
  { id: 'interjection', name: 'Interjection' },
  { id: 'pronoun', name: 'Pronoun' },
];

const moduleOrder = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Reading', 'Writing'];

const MCQ_MODULES = [
  { id: 'GRAMMAR', name: 'Grammar', color: 'from-blue-500 to-blue-600' },
  { id: 'VOCABULARY', name: 'Vocabulary', color: 'from-green-500 to-green-600' },
  { id: 'READING', name: 'Reading', color: 'from-purple-500 to-purple-600' },
];

const MCQ_FORMAT_NOTE = `\nAccepted formats:\n- CSV/XLSX with headers: Question,A,B,C,D,Answer,Level\n- Plain text (one question per block):\n1. Which of the following is a proper noun?\nA) city\nB) school\nC) London\nD) teacher\nAnswer: C\n`;

const renderPreviewTable = (questions, duplicateMap) => {
  if (!questions || questions.length === 0) return null;
  const uniqueCount = questions.filter((q, idx) => !duplicateMap[idx]).length;
  const duplicateCount = questions.length - uniqueCount;
  return (
    <div className="overflow-x-auto mt-6">
      <div className="mb-2 text-sm">
        <span className="text-green-700 font-semibold">{uniqueCount} unique</span> &bull; <span className="text-red-600 font-semibold">{duplicateCount} duplicate</span>
      </div>
      <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
        <thead className="bg-green-100">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Question</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">A</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">B</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">C</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">D</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Correct</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Module</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Level</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Type</th>
            <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, idx) => (
            <tr key={idx} className="bg-white">
              <td className="px-4 py-2 text-sm text-gray-900">{q.type === 'MCQ' ? q.question_text : q.question}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{q.options?.A || ''}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{q.options?.B || ''}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{q.options?.C || ''}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{q.options?.D || ''}</td>
              <td className="px-4 py-2 text-sm text-green-700 font-bold">{q.correct_option || ''}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{q.module}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{q.level}</td>
              <td className="px-4 py-2 text-sm text-blue-700 font-bold">{q.type || 'Text'}</td>
              <td className="px-4 py-2 text-sm">
                {duplicateMap[idx] ? (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">Duplicate</span>
                ) : (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Unique</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const QuestionBankUpload = () => {
  // All hooks at the top
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
    const fetchOptions = async () => {
      try {
        const res = await api.get('/test-management/get-test-data');
        setModules(res.data.data.modules || []);
        setLevels(res.data.data.levels || []);
      } catch (err) {
        setErrorMsg('Failed to fetch modules and levels');
      }
    };
    fetchOptions();
  }, []);

  // Sorting modules
  const sortedModules = [
    ...moduleOrder.map(name => modules.find(m => m.name.toLowerCase() === name.toLowerCase())).filter(Boolean),
    ...modules.filter(m => !moduleOrder.map(n => n.toLowerCase()).includes(m.name.toLowerCase())),
  ];

  // Level options
  const isGrammar = selectedModule && selectedModule.name.toLowerCase() === 'grammar';
  const levelOptions = isGrammar ? grammarLevels : levels;
  const selectedLevel = levelOptions.find(l => l.id === levelId);

  // Handlers
  const handleModuleSelect = (module) => {
    setSelectedModule(module);
    setCurrentStep('levels');
    setLevelId('');
    setQuestions([]);
    setSuccessMsg('');
    setErrorMsg('');
    setShowPreview(false);
  };
  const handleBackToModules = () => {
    setSelectedModule(null);
    setLevelId('');
    setCurrentStep('modules');
    setQuestions([]);
    setSuccessMsg('');
    setErrorMsg('');
    setShowPreview(false);
  };
  const parsePlainTextMCQ = (text) => {
    // Split by lines starting with a serial number (e.g., 1. ... 2. ...)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const questions = [];
    let current = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const serialMatch = line.match(/^(\d+)\./);
      if (serialMatch) {
        // Start a new question block
        if (current) questions.push(current);
        current = { raw: [line] };
      } else if (current) {
        current.raw.push(line);
      }
    }
    if (current) questions.push(current);
    // Now parse each block
    const parsed = [];
    for (const block of questions) {
      const qLine = block.raw[0];
      const question_text = qLine.replace(/^(\d+)\./, '').trim();
      let A, B, C, D, correct_option;
      for (const l of block.raw.slice(1)) {
        if (l.startsWith('A)')) A = l.replace('A)', '').trim();
        else if (l.startsWith('B)')) B = l.replace('B)', '').trim();
        else if (l.startsWith('C)')) C = l.replace('C)', '').trim();
        else if (l.startsWith('D)')) D = l.replace('D)', '').trim();
        else if (/^Answer:/i.test(l)) {
          const ans = l.match(/^Answer:\s*([A-D])/i);
          if (ans) correct_option = ans[1].toUpperCase();
        }
      }
      if (question_text && A && B && C && D && correct_option) {
        parsed.push({
          type: 'MCQ',
          question_text,
          options: { A, B, C, D },
          correct_option,
          module: selectedModule?.name,
          level: levelId,
          used_count: 0,
          last_used: null
        });
      }
    }
    return parsed;
  };
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let parsedQuestions = [];
        let parseError = false;
        if (fileExtension === 'csv') {
          try {
            const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
            parsedQuestions = result.data.map(row => {
              if (row.Question && row.A && row.B && row.C && row.D && row.Answer) {
                return {
                  question: row.Question,
                  optionA: row.A,
                  optionB: row.B,
                  optionC: row.C,
                  optionD: row.D,
                  answer: row.Answer,
                  set: row.Set || row.set || 'Set-1',
                  level: row.Level || row.level || '',
                };
              }
              return null;
            }).filter(Boolean);
          } catch {
            parseError = true;
          }
        } else if (fileExtension === 'xlsx') {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            parsedQuestions = jsonData.map(row => {
              if (row.Question && row.A && row.B && row.C && row.D && row.Answer) {
                return {
                  question: row.Question,
                  optionA: row.A,
                  optionB: row.B,
                  optionC: row.C,
                  optionD: row.D,
                  answer: row.Answer,
                  set: row.Set || row.set || 'Set-1',
                  level: row.Level || row.level || '',
                };
              }
              return null;
            }).filter(Boolean);
          } catch {
            parseError = true;
          }
        } else {
          // Try plain text MCQ block parsing
          parsedQuestions = parsePlainTextMCQ(e.target.result);
          if (!parsedQuestions.length) parseError = true;
        }
        if (!parsedQuestions.length) parseError = true;
        if (parseError) {
          setQuestions([]);
          setSuccessMsg('');
          setErrorMsg('Failed to parse file.');
          setShowPreview(false);
          return;
        }
        setQuestions(parsedQuestions);
        setSuccessMsg(`Loaded ${parsedQuestions.length} questions.`);
        setErrorMsg('');
        setShowPreview(true);
        await checkDuplicates(parsedQuestions);
      } catch (err) {
        setErrorMsg('Failed to parse file.');
        setSuccessMsg('');
        setShowPreview(false);
      }
    };
    if (fileExtension === 'csv') {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
    event.target.value = null;
  };
  const handleUpload = async () => {
    if (!selectedModule || questions.length === 0) {
      setErrorMsg('Please select module and upload questions.');
      setSuccessMsg('');
      return;
    }
    // Only upload unique questions
    const uniqueQuestions = questions.filter((q, idx) => !duplicateMap[idx]);
    if (uniqueQuestions.length === 0) {
      setErrorMsg('No unique questions to upload.');
      setSuccessMsg('');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        module_id: selectedModule.id,
        level_id: levelId || '',
        questions: uniqueQuestions.map(q => ({
          question: q.question,
          options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
          correct_answer: q.answer,
          set: q.set,
          level: q.level,
        })),
      };
      await api.post('/test-management/module-question-bank/upload', payload);
      setSuccessMsg('Questions uploaded to module bank!');
      setQuestions([]);
      setDuplicateMap({});
      setErrorMsg('');
      setShowPreview(false);
    } catch (err) {
      setErrorMsg('Failed to upload questions.');
      setSuccessMsg('');
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicates = async (questionsToCheck) => {
    // Call backend to check for duplicates
    if (!selectedModule || !levelId) return;
    try {
      const res = await api.post('/test-management/question-bank/check-duplicates', {
        module_id: selectedModule.id,
        level_id: levelId,
        questions: questionsToCheck.map(q => q.question)
      });
      setDuplicateMap(res.data.duplicates || {});
    } catch (err) {
      console.error('Failed to check duplicates:', err);
    }
  };

  // UI
  const mainContent = (
    currentStep === 'modules' ? (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Select Module for Question Upload</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Module</h2>
            <p className="text-gray-600 mb-6">Click on a module to proceed with question upload for that module.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedModules.map((module) => (
              <motion.div
                key={module.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-green-500"
                onClick={() => handleModuleSelect(module)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <FileQuestion className="h-6 w-6 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{module.name}</h3>
                <p className="text-sm text-gray-600">Click to upload questions for this module</p>
              </motion.div>
            ))}
          </div>
          {modules.length === 0 && (
            <div className="text-center py-12">
              <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No modules available</p>
            </div>
          )}
        </div>
      </motion.div>
    ) : (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Upload Questions</h1>
            <p className="text-gray-600 mt-2">Module: <span className="font-semibold text-green-700">{selectedModule?.name}</span></p>
          </div>
          <button onClick={handleBackToModules} className="text-sm font-medium text-gray-500 hover:text-green-600 transition-colors">&larr; Back to Modules</button>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-xl border border-green-200 p-8 max-w-3xl mx-auto"
        >
          <div className="mb-2 text-xs text-gray-600 whitespace-pre-line">{MCQ_FORMAT_NOTE}</div>
          {/* Level Dropdown */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Select Level</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all duration-200 bg-white text-gray-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200 ${dropdownOpen ? 'border-green-600' : 'border-green-300 hover:border-green-500'}`}
                >
                  <span>{selectedLevel ? selectedLevel.name : 'Select Level'}</span>
                  <motion.span animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-5 w-5 text-green-600" />
                  </motion.span>
                </button>
                {dropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 mt-2 w-full bg-white border border-green-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {levelOptions.map(l => (
                      <li
                        key={l.id}
                        onClick={() => { setLevelId(l.id); setDropdownOpen(false); }}
                        className={`px-4 py-2 cursor-pointer hover:bg-green-50 transition-colors ${levelId === l.id ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-800'}`}
                      >
                        {l.name}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </div>
            </div>
            {/* File Upload */}
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Upload Questions (CSV/XLSX/TXT)</label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border-2 border-green-300 hover:bg-green-100 hover:border-green-500 cursor-pointer transition-all duration-200 shadow-sm font-medium text-green-700">
                <UploadIcon className="h-5 w-5 mr-2 text-green-600" />
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="block mt-2 text-xs text-gray-500">{questions.length === 0 ? 'No file chosen' : `${questions.length} questions loaded.`}</span>
            </div>
          </div>
          <hr className="my-6 border-green-100" />
          {/* Questions Preview Table */}
          {renderPreviewTable(questions, duplicateMap)}
          {/* Questions Status & Upload Button */}
          <div className="flex flex-col items-center space-y-4 mt-4">
            {successMsg && <span className="text-green-700 font-medium">{successMsg}</span>}
            {errorMsg && <span className="text-red-600 font-medium">{errorMsg}</span>}
            <p className="text-gray-700">
              {questions.length > 0 ? (
                <span className="text-green-700 font-medium">{questions.length} questions ready to upload.</span>
              ) : (
                <span className="text-gray-500">No questions loaded yet. Please upload a file.</span>
              )}
            </p>
            <motion.button
              whileHover={{ scale: questions.length > 0 && levelId ? 1.04 : 1, boxShadow: questions.length > 0 && levelId ? '0 4px 16px 0 rgba(22, 163, 74, 0.15)' : 'none' }}
              whileTap={{ scale: questions.length > 0 && levelId ? 0.98 : 1 }}
              onClick={handleUpload}
              disabled={loading || !levelId || questions.length === 0}
              className={`w-full md:w-auto px-8 py-3 rounded-lg font-semibold transition-all duration-200 text-white ${loading || !levelId || questions.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}
            >
              {loading ? 'Uploading...' : 'Upload to Module Bank'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )
  );

  // Modal for Upload Preview
  if (showPreviewModal) {
    const uniqueCount = questions.filter((q, idx) => !duplicateMap[idx]).length;
    const duplicateCount = questions.length - uniqueCount;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 relative animate-fadeIn">
          <h2 className="text-2xl font-bold text-center mb-2 text-green-900">Upload Preview</h2>
          <div className="text-center text-gray-700 mb-4">
            Found {questions.length} questions in the file. {questions.length - duplicateCount} are new and will be added.
          </div>
          <div className="overflow-y-auto max-h-96 border rounded-xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider">Question</th>
                  <th className="px-4 py-2 text-left text-xs font-bold text-green-900 uppercase tracking-wider w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={idx} className="bg-white hover:bg-green-50 transition">
                    <td className="px-4 py-2 text-sm text-gray-900 font-semibold">{idx + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate" title={q.type === 'MCQ' ? q.question_text : q.question}>
                      {q.type === 'MCQ' ? q.question_text : q.question}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {duplicateMap[idx] ? (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">Duplicate</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-6 space-x-4">
            <button
              className="px-6 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition font-semibold"
              onClick={() => setShowPreviewModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition disabled:opacity-50"
              onClick={async () => {
                await handleUpload();
                setShowPreviewModal(false);
              }}
              disabled={questions.length === 0 || loading}
            >
              {loading ? 'Uploading...' : `Add ${questions.filter((q, idx) => !duplicateMap[idx]).length} New Questions`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <main className="px-6 lg:px-10 py-12">
          <h1 className="text-3xl font-bold mb-8">Bulk MCQ Upload</h1>
          {!selectedModule ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {MCQ_MODULES.map(module => (
                <div
                  key={module.id}
                  className={`rounded-2xl shadow-lg p-8 cursor-pointer bg-gradient-to-br ${module.color} text-white hover:scale-105 transition-all duration-300`}
                  onClick={() => handleModuleSelect(module)}
                >
                  <h2 className="text-2xl font-bold mb-2">{module.name}</h2>
                  <p>Upload MCQs for {module.name} module</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
              <button onClick={handleBackToModules} className="mb-4 text-blue-600 hover:underline">&larr; Back to Modules</button>
              <h2 className="text-xl font-bold mb-4">Upload MCQs for {selectedModule.name}</h2>
              <label className="block mb-2 font-semibold">Upload CSV/XLSX (columns: Question, A, B, C, D, Answer, Level, Set)</label>
              <input type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="mb-4" />
              {errorMsg && <div className="text-red-600 mb-2">{errorMsg}</div>}
              {showPreview && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Preview Questions ({questions.length})</h3>
                  <div className="max-h-64 overflow-y-auto border rounded p-2 bg-gray-50">
                    {questions.map((q, i) => (
                      <div key={i} className="mb-2 border-b pb-2 last:border-b-0">
                        <div className="font-bold">Q{i+1}: {q.question}</div>
                        <div className="ml-4">A) {q.optionA}  B) {q.optionB}  C) {q.optionC}  D) {q.optionD}</div>
                        <div className="ml-4 text-sm">Answer: <span className="font-semibold text-green-700">{q.answer}</span> | Level: {q.level} | Set: {q.set}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleUpload} disabled={loading} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">{loading ? 'Uploading...' : 'Upload to Backend'}</button>
                  {successMsg && <div className="text-green-600 mt-2">{successMsg}</div>}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuestionBankUpload; 
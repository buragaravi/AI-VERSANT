import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function parseHumanReadableMCQ(text) {
  // Split by question blocks
  const blocks = text.split(/\n\s*\d+\./).filter(Boolean);
  const questions = [];
  blocks.forEach(block => {
    // Extract question
    const lines = block.trim().split(/\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 6) return;
    const questionLine = lines[0];
    const options = {};
    let answer = '';
    lines.forEach(line => {
      if (/^A\)/.test(line)) options.A = line.replace(/^A\)\s*/, '');
      if (/^B\)/.test(line)) options.B = line.replace(/^B\)\s*/, '');
      if (/^C\)/.test(line)) options.C = line.replace(/^C\)\s*/, '');
      if (/^D\)/.test(line)) options.D = line.replace(/^D\)\s*/, '');
      if (/^Answer:/i.test(line)) answer = line.replace(/^Answer:\s*/i, '').trim();
    });
    if (questionLine && options.A && options.B && options.C && options.D && answer) {
      questions.push({
        question: questionLine,
        optionA: options.A,
        optionB: options.B,
        optionC: options.C,
        optionD: options.D,
        answer,
      });
    }
  });
  return questions;
}

export default function MCQUpload({ questions, setQuestions, onNext, onBack, moduleName }) {
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [error, setError] = useState('');

  const processQuestionsForPreview = (parsedQuestions) => {
    const existingQuestionTexts = new Set(questions.map(q => q.question.trim().toLowerCase()));
    const questionsForPreview = [];
    parsedQuestions.forEach(q => {
      const questionText = q.question?.trim();
      if (!questionText) return;
      const questionTextLower = questionText.toLowerCase();
      if (existingQuestionTexts.has(questionTextLower)) {
        questionsForPreview.push({ ...q, status: 'Duplicate' });
      } else {
        questionsForPreview.push({ ...q, status: 'New' });
        existingQuestionTexts.add(questionTextLower);
      }
    });
    if (questionsForPreview.length === 0) {
      setError('Could not find any questions in the uploaded file.');
      return;
    }
    setPreviewQuestions(questionsForPreview);
    setIsPreviewModalOpen(true);
  };

  const toBackendFormat = (q) =>
    `${q.question}\nA) ${q.optionA}\nB) ${q.optionB}\nC) ${q.optionC}\nD) ${q.optionD}\nAnswer: ${q.answer}`;

  const handleConfirmPreview = () => {
    const newQuestions = previewQuestions
      .filter(q => q.status === 'New')
      .map(q => ({ question: toBackendFormat(q) }));
    setQuestions(current => [...current, ...newQuestions]);
    setIsPreviewModalOpen(false);
    setPreviewQuestions([]);
    setError('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'text/plain'
    ];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidExtension = ['csv', 'xlsx', 'xls', 'txt'].includes(fileExtension);
    const isValidType = allowedTypes.includes(file.type) || file.type === '';
    if (!isValidExtension && !isValidType) {
      setError(`Invalid file type. Please upload a .csv, .xlsx, .xls, or .txt file. Received: ${file.type || fileExtension}`);
      event.target.value = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let parsedQuestions = [];
        if (fileExtension === 'csv' || file.type === 'text/csv') {
          const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true, trimHeaders: true, trimValues: true });
          if (result.data.length === 0) throw new Error('No data found in CSV file.');
          parsedQuestions = result.data.map(row => ({
            question: row.question || row.Question || '',
            optionA: row.optionA || row.OptionA || row.A || '',
            optionB: row.optionB || row.OptionB || row.B || '',
            optionC: row.optionC || row.OptionC || row.C || '',
            optionD: row.optionD || row.OptionD || row.D || '',
            answer: row.answer || row.Answer || '',
          }));
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          if (!workbook.SheetNames.length) throw new Error('No sheets found in Excel file.');
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) throw new Error(`Sheet "${sheetName}" not found.`);
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          parsedQuestions = jsonData.map(row => ({
            question: row.question || row.Question || '',
            optionA: row.optionA || row.OptionA || row.A || '',
            optionB: row.optionB || row.OptionB || row.B || '',
            optionC: row.optionC || row.OptionC || row.C || '',
            optionD: row.optionD || row.OptionD || row.D || '',
            answer: row.answer || row.Answer || '',
          }));
        } else if (fileExtension === 'txt' || file.type === 'text/plain') {
          parsedQuestions = parseHumanReadableMCQ(e.target.result);
        } else {
          // Try to parse as plain text as fallback
          parsedQuestions = parseHumanReadableMCQ(e.target.result);
        }
        const finalQuestions = parsedQuestions.filter(q => q && q.question && q.optionA && q.optionB && q.optionC && q.optionD && q.answer);
        if (finalQuestions.length === 0) throw new Error('No valid questions found in the file.');
        processQuestionsForPreview(finalQuestions);
      } catch (err) {
        setError(`File processing error: ${err.message}`);
      }
    };
    reader.onerror = () => setError('An unexpected error occurred while reading the file.');
    if (fileExtension === 'csv' || file.type === 'text/csv' || fileExtension === 'txt' || file.type === 'text/plain') {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
    event.target.value = null;
  };

  return (
    <div>
      <h3 className="font-semibold text-lg mb-2">Upload MCQ Questions for {moduleName}</h3>
      <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileUpload} />
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h4 className="font-bold mb-2">Preview Questions</h4>
            <ul className="max-h-60 overflow-y-auto mb-4">
              {previewQuestions.map((q, i) => (
                <li key={i} className={q.status === 'Duplicate' ? 'text-yellow-600' : 'text-green-700'}>
                  {q.question} <span className="text-xs">({q.status})</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setIsPreviewModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleConfirmPreview} className="px-4 py-2 bg-blue-600 text-white rounded">Add New</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 rounded">Back</button>
        <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded">Next</button>
      </div>
    </div>
  );
} 
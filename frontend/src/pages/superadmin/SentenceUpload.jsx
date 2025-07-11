import React, { useState } from 'react';
import Papa from 'papaparse';

export default function SentenceUpload({ sentences, setSentences, onNext, onBack, moduleName }) {
  const [previewSentences, setPreviewSentences] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [error, setError] = useState('');

  const processSentencesForPreview = (parsed) => {
    const existing = new Set(sentences.map(s => s.trim().toLowerCase()));
    const preview = [];
    parsed.forEach(s => {
      const text = s.trim();
      if (!text) return;
      if (existing.has(text.toLowerCase())) {
        preview.push({ text, status: 'Duplicate' });
      } else {
        preview.push({ text, status: 'New' });
        existing.add(text.toLowerCase());
      }
    });
    if (preview.length === 0) {
      setError('No valid sentences found.');
      return;
    }
    setPreviewSentences(preview);
    setIsPreviewModalOpen(true);
  };

  const handleConfirmPreview = () => {
    const newSentences = previewSentences.filter(s => s.status === 'New').map(s => s.text);
    setSentences(current => [...current, ...newSentences]);
    setIsPreviewModalOpen(false);
    setPreviewSentences([]);
    setError('');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type === 'text/csv') {
      Papa.parse(file, {
        complete: (result) => {
          const parsed = result.data.flat().filter(Boolean);
          processSentencesForPreview(parsed);
        },
        error: () => setError('Failed to parse CSV.'),
      });
    } else if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
        processSentencesForPreview(lines);
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsText(file);
    } else {
      setError('Only .txt or .csv files are allowed.');
    }
    event.target.value = null;
  };

  return (
    <div>
      <h3 className="font-semibold text-lg mb-2">Upload Sentences for {moduleName}</h3>
      <input type="file" accept=".txt,.csv" onChange={handleFileUpload} />
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {/* Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h4 className="font-bold mb-2">Preview Sentences</h4>
            <ul className="max-h-60 overflow-y-auto mb-4">
              {previewSentences.map((s, i) => (
                <li key={i} className={s.status === 'Duplicate' ? 'text-yellow-600' : 'text-green-700'}>
                  {s.text} <span className="text-xs">({s.status})</span>
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
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, Code, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const TechnicalCodeEditor = ({
  question,
  testId,
  onSubmit,
  allowedLanguages = ['python', 'c', 'cpp', 'java', 'html'],
  showSubmit = true,
  readOnly = false
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  console.log('Selected Language:', selectedLanguage);
  console.log('Code:', code);
  console.log('Stdin:', stdin);
  console.log('Output:', output);
  console.log(" Test ID:", testId);
  console.log('Question:', questio);

  // Language configuration
  const languageConfig = {
    python: {
      name: 'Python',
      monacoLang: 'python',
      defaultCode: '# Write your Python code here\nprint("Hello, World!")'
    },
    c: {
      name: 'C',
      monacoLang: 'c',
      defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}'
    },
    cpp: {
      name: 'C++',
      monacoLang: 'cpp',
      defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}'
    },
    java: {
      name: 'Java',
      monacoLang: 'java',
      defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
    },
    html: {
      name: 'HTML',
      monacoLang: 'html',
      defaultCode: '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>'
    }
  };

  // Initialize code when language changes
  useEffect(() => {
    console.log('Language changed to:', selectedLanguage);
    if (question?.starter_code) {
      setCode(question.starter_code);
    } else {
      setCode(languageConfig[selectedLanguage]?.defaultCode || '');
    }
  }, [selectedLanguage, question]);

  // Handle language change
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setOutput(null);
    setTestResults(null);
  };

  // Run code (test with sample input)
  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsRunning(true);
    setOutput(null);

    try {
      const response = await api.post('/test-management/technical/compile', {
        language: selectedLanguage,
        code: code,
        stdin: stdin
      });

      if (response.data.success) {
        setOutput({
          stdout: response.data.stdout,
          stderr: response.data.stderr,
          exitCode: response.data.exit_code,
          executionTime: response.data.execution_time
        });

        if (response.data.stderr) {
          toast.error('Code has errors');
        } else {
          toast.success('Code executed successfully!');
        }
      } else {
        setOutput({
          stderr: response.data.error || 'Compilation failed',
          exitCode: 1
        });
        toast.error('Compilation failed');
      }
    } catch (error) {
      console.error('Error running code:', error);
      setOutput({
        stderr: error.response?.data?.error || 'Failed to execute code',
        exitCode: 1
      });
      toast.error('Failed to execute code');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit answer (validate against test cases)
  const handleSubmit = async () => {
    // Debug log to verify payload
    console.log('Submitting answer:', {
      test_id: testId,
      question_id: question?._id,
      language: selectedLanguage,
      code
    });

    if (!testId || !question?._id || !selectedLanguage || !code.trim()) {
      toast.error('Missing required fields: testId, questionId, language, or code');
      return;
    }

    setIsSubmitting(true);
    setTestResults(null);

    try {
      const response = await api.post('/test-management/technical/submit-answer', {
        test_id: testId,
        question_id: question._id,
        language: selectedLanguage,
        code: code
      });

      if (response.data.success) {
        setTestResults(response.data.data);
        toast.success(`Answer submitted! Score: ${response.data.data.total_score}/${response.data.data.max_score}`);
        if (onSubmit) {
          onSubmit({
            questionId: question._id,
            code,
            language: selectedLanguage,
            results: response.data.data
          });
        }
      } else {
        toast.error(response.data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error(error.response?.data?.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="technical-code-editor bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Code Editor</h3>
        </div>
        {/* Submit Button always visible if showSubmit is true */}
        {showSubmit && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isSubmitting || !testId || !question?._id || !selectedLanguage || !code.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>

      {/* Language Selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Language:</label>
        <select
          value={selectedLanguage}
          onChange={handleLanguageChange}
          disabled={readOnly || isRunning || isSubmitting}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {allowedLanguages.map(lang => (
            <option key={lang} value={lang}>
              {languageConfig[lang]?.name || lang}
            </option>
          ))}
        </select>
      </div>

      {/* Question */}
      {question && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
          <p className="text-gray-700 whitespace-pre-wrap">{question.question}</p>
          {question.instructions && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-600">Instructions:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{question.instructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Code Editor */}
      <div className="mb-4">
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <Editor
            height="400px"
            language={languageConfig[selectedLanguage]?.monacoLang || 'plaintext'}
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-light"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              readOnly: readOnly || isRunning || isSubmitting,
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
              }
            }}
          />
        </div>
      </div>

      {/* Input Section (for testing) */}
      {selectedLanguage !== 'html' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input (stdin) - Optional:
          </label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            disabled={readOnly || isRunning || isSubmitting}
            placeholder="Enter input for your program (one value per line)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            rows="3"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleRunCode}
          disabled={readOnly || isRunning || isSubmitting || !code.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Code
            </>
          )}
        </button>
        {showSubmit && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !testId || !question?._id || !selectedLanguage || !code.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Answer
              </>
            )}
          </button>
        )}
      </div>

      {/* Output Section */}
      {output && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            {output.exitCode === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Output:
          </h4>

          {output.stdout && (
            <div className="mb-2">
              <p className="text-sm font-medium text-green-700">✅ Output:</p>
              <pre className="mt-1 p-2 bg-white border border-gray-200 rounded text-sm font-mono whitespace-pre-wrap">
                {output.stdout}
              </pre>
            </div>
          )}

          {output.stderr && (
            <div className="mb-2">
              <p className="text-sm font-medium text-red-700">❌ Errors:</p>
              <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm font-mono whitespace-pre-wrap text-red-700">
                {output.stderr}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Execution Time: {output.executionTime || 0}ms
            </span>
            <span>Exit Code: {output.exitCode}</span>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Test Results:</h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{testResults.total_score}</p>
              <p className="text-sm text-gray-600">Score</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{testResults.max_score}</p>
              <p className="text-sm text-gray-600">Max Score</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">{testResults.passed_count}</p>
              <p className="text-sm text-gray-600">Passed</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-red-600">{testResults.failed_count}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>

          {testResults.test_results && testResults.test_results.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium text-gray-700">Test Cases:</p>
              {testResults.test_results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${result.passed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Test Case {result.test_case_number}
                      {result.is_sample && <span className="ml-2 text-xs text-blue-600">(Sample)</span>}
                    </span>
                    <span className={`flex items-center gap-1 ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
                      {result.passed ? (
                        <><CheckCircle className="h-4 w-4" /> Passed</>
                      ) : (
                        <><XCircle className="h-4 w-4" /> Failed</>
                      )}
                    </span>
                  </div>
                  {result.is_sample && (
                    <div className="mt-2 text-sm">
                      <p><span className="font-medium">Input:</span> {result.input}</p>
                      <p><span className="font-medium">Expected:</span> {result.expected_output}</p>
                      <p><span className="font-medium">Your Output:</span> {result.actual_output}</p>
                    </div>
                  )}
                  <p className="text-sm mt-1">Points: {result.points_earned}/{result.points}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TechnicalCodeEditor;

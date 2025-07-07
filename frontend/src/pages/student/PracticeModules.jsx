import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { BookOpen, BrainCircuit, ChevronLeft, Lock, Unlock, CheckCircle, XCircle, Ear } from 'lucide-react';

const moduleIcons = {
  GRAMMAR: BrainCircuit,
  VOCABULARY: BookOpen,
  LISTENING: Ear,
  DEFAULT: BookOpen
};

const PracticeModules = () => {
  const [view, setView] = useState('main'); // 'main', 'grammar_categories', 'module_list', 'taking_module', 'result'
  const [modules, setModules] = useState([]);
  const [grammarProgress, setGrammarProgress] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [moduleList, setModuleList] = useState([]);
  const [currentModule, setCurrentModule] = useState(null);
  const [moduleResult, setModuleResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const { error: showError, success } = useNotification();

  const resetToMain = () => {
    setView('main');
    setCurrentCategory(null);
    setModuleList([]);
    setCurrentModule(null);
    setModuleResult(null);
  };
  
  const handleSelectModule = (module) => {
    if (module.locked) {
      setIsPopupVisible(true);
      return;
    }

    if (module.id === 'GRAMMAR') {
      setView('grammar_categories');
    } else {
      setCurrentCategory({ id: module.id, name: module.name });
      setView('module_list');
    }
  };

  const handleSelectCategory = (category) => {
    if (category.unlocked) {
      setCurrentCategory({ ...category, id: 'GRAMMAR', subId: category.id, name: category.name });
      setView('module_list');
    } else {
      showError("Complete the previous part with a score of 60% or more to unlock this.");
    }
  };

  const handleSelectPracticeModule = (module) => {
    setCurrentModule(module);
    setView('taking_module');
  };

  const handleModuleSubmit = (result) => {
    setModuleResult(result);
    // After submitting, fetch the latest grammar progress if it was a grammar module
    if (currentCategory?.id === 'GRAMMAR') {
       fetchGrammarProgress();
    }
    setView('result');
  };

  const fetchGrammarProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/grammar-progress');
      setGrammarProgress(res.data.data);
    } catch (err) {
      showError('Failed to load your grammar progress. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (view === 'main') {
      const fetchModules = async () => {
        try {
          setLoading(true);
          const res = await api.get('/student/modules');
          const modulesWithIcons = res.data.data.map(m => ({ ...m, icon: moduleIcons[m.id] || moduleIcons.DEFAULT }));
          setModules(modulesWithIcons);
        } catch (err) {
          showError('Failed to load practice modules.');
          setModules([]);
        } finally {
          setLoading(false);
        }
      };
      fetchModules();
    } else if (view === 'grammar_categories') {
      fetchGrammarProgress();
    } else if (view === 'module_list' && currentCategory) {
      const fetchModules = async () => {
        try {
          setLoading(true);
          let params = { module: currentCategory.id };
          // For Grammar, we use the subcategory ID
          if (currentCategory.id === 'GRAMMAR' && currentCategory.subId) {
             params.subcategory = currentCategory.subId;
          }
          
          const res = await api.get('/student/tests', { params });
          setModuleList(res.data.data);
        } catch (err) {
          showError('Failed to load modules for this category.');
        } finally {
          setLoading(false);
        }
      };
      fetchModules();
    }
  }, [view, currentCategory, fetchGrammarProgress, showError]);

  const renderContent = () => {
    if (loading) return <LoadingSpinner />;

    switch (view) {
      case 'grammar_categories':
        return <GrammarCategoryView categories={grammarProgress} onSelectCategory={handleSelectCategory} onBack={resetToMain} />;
      case 'module_list':
        return <ModuleListView category={currentCategory} modules={moduleList} onSelectModule={handleSelectPracticeModule} onBack={() => setView(currentCategory.id === 'GRAMMAR' ? 'grammar_categories' : 'main')} />;
      case 'taking_module':
        return <ModuleTakingView module={currentModule} onSubmit={handleModuleSubmit} onBack={() => setView('module_list')}/>;
      case 'result':
        return <ResultView result={moduleResult} onBack={() => { setView('module_list'); setModuleResult(null); }} />;
      default: // 'main'
        return <MainView modules={modules} onSelectModule={handleSelectModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <main className="px-6 lg:px-10 py-12">
          {renderContent()}
        </main>
      </div>
      <PopupModal 
        isVisible={isPopupVisible} 
        onClose={() => setIsPopupVisible(false)} 
      />
    </div>
  );
};

const MainView = ({ modules, onSelectModule }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-8">Practice Modules</h1>
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
      {modules.map(module => (
        <motion.div
          key={module.id}
          whileHover={!module.locked ? { scale: 1.05 } : {}}
          className={clsx(
            "bg-white p-6 sm:p-8 rounded-2xl shadow-lg flex flex-col items-center text-center relative",
            {
              "cursor-pointer": !module.locked,
              "opacity-60 bg-gray-100 cursor-not-allowed": module.locked,
            }
          )}
          onClick={() => onSelectModule(module)}
        >
          {module.locked && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-gray-300 p-2 rounded-full">
              <Lock className="h-5 w-5 text-gray-600" />
            </div>
          )}
          <module.icon className={clsx("h-16 w-16 sm:h-20 sm:w-20 mb-4", {
            "text-indigo-500": !module.locked,
            "text-gray-400": module.locked
          })} />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">{module.name}</h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Improve your {module.name.toLowerCase()} skills.</p>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const PopupModal = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
      >
        <div className="mx-auto bg-yellow-100 h-20 w-20 flex items-center justify-center rounded-full">
          <BrainCircuit className="h-12 w-12 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-6">Coming Soon!</h2>
        <p className="text-gray-600 mt-4">
          This module is under development. Please complete the Grammar and Vocabulary sections first to build your foundation.
        </p>
        <button 
          onClick={onClose}
          className="mt-8 w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Got it!
        </button>
      </motion.div>
    </div>
  );
};

const GrammarCategoryView = ({ categories, onSelectCategory, onBack }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="flex items-center mb-8">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4"><ChevronLeft /></button>
        <h1 className="text-3xl font-bold text-gray-800">Grammar Learning Path</h1>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat, index) => (
        <motion.div
          key={cat.id}
          whileHover={cat.unlocked ? { scale: 1.05 } : {}}
          className={clsx("bg-white p-6 rounded-xl shadow-lg relative", {
            "cursor-pointer": cat.unlocked,
            "opacity-60 bg-gray-100": !cat.unlocked,
          })}
          onClick={() => onSelectCategory(cat)}
        >
          <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-semibold text-indigo-600">Part {index + 1}</p>
                <h3 className="text-xl font-bold text-gray-800 mt-1">{cat.name}</h3>
            </div>
            {cat.unlocked ? <Unlock className="h-6 w-6 text-green-500" /> : <Lock className="h-6 w-6 text-gray-400" />}
          </div>
          <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${cat.score}%` }}></div>
              </div>
              <p className="text-right text-sm text-gray-600 mt-1">Highest Score: {cat.score.toFixed(0)}%</p>
          </div>
          {!cat.unlocked && <p className="text-xs text-center text-yellow-800 bg-yellow-100 p-2 rounded-md mt-4">Complete the previous part with 60% or more to unlock.</p>}
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const ModuleListView = ({ category, modules, onSelectModule, onBack }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center mb-8">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-2 sm:mr-4"><ChevronLeft /></button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{category.name} Modules</h1>
        </div>
        {modules.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {modules.map(module => (
                    <motion.div
                        key={module._id}
                        whileHover={{ scale: 1.05 }}
                        className="bg-white p-6 rounded-xl shadow-lg cursor-pointer flex flex-col justify-between"
                        onClick={() => onSelectModule(module)}
                    >
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800">{module.name}</h3>
                            <p className="text-gray-500 mt-2 text-xs sm:text-sm">A practice module to test your skills.</p>
                        </div>
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${module.highest_score || 0}%` }}></div>
                            </div>
                            <p className="text-right text-xs sm:text-sm text-gray-600 mt-1">Highest Score: {Math.round(module.highest_score || 0)}%</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        ) : (
            <div className="text-center py-16">
                <h2 className="text-xl font-semibold text-gray-700">No Modules Here Yet</h2>
                <p className="text-gray-500 mt-2">Check back later for new practice modules in this category.</p>
            </div>
        )}
  </motion.div>
);

const ModuleTakingView = ({ module, onSubmit, onBack }) => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const { error: showError, success } = useNotification();
    const [cheatWarning, setCheatWarning] = useState(false);
    const [cheatCount, setCheatCount] = useState(0);
    const examRef = useRef(null);
    const [recordings, setRecordings] = useState({}); // For speaking answers
    const mediaRecorderRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingQuestionId, setRecordingQuestionId] = useState(null);
    const [audioURLs, setAudioURLs] = useState({});

    useEffect(() => {
        const fetchModuleDetails = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/student/test/${module._id}`);
                // The questions are already structured correctly by the backend
                setQuestions(res.data.data.questions || []);
            } catch (err) {
                showError("Failed to load module questions.");
            } finally {
                setLoading(false);
            }
        };

        if (module?._id) {
            fetchModuleDetails();
        }
    }, [module, showError]);

    useEffect(() => {
        // Anti-cheating: Prevent tab switching
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setCheatWarning(true);
                setCheatCount(prev => prev + 1);
                // Optionally, auto-submit after N violations
                // if (cheatCount + 1 >= 2) handleSubmit();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Prevent copy/cut/paste and text selection
        const preventAction = (e) => e.preventDefault();
        const examNode = examRef.current;
        if (examNode) {
            examNode.addEventListener('copy', preventAction);
            examNode.addEventListener('cut', preventAction);
            examNode.addEventListener('paste', preventAction);
            examNode.addEventListener('contextmenu', preventAction);
            examNode.addEventListener('selectstart', preventAction);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (examNode) {
                examNode.removeEventListener('copy', preventAction);
                examNode.removeEventListener('cut', preventAction);
                examNode.removeEventListener('paste', preventAction);
                examNode.removeEventListener('contextmenu', preventAction);
                examNode.removeEventListener('selectstart', preventAction);
            }
        };
    }, [cheatCount]);

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    // Audio recording logic for Speaking module
    const startRecording = async (questionId) => {
        setRecordingQuestionId(questionId);
        setIsRecording(true);
        if (navigator.mediaDevices && window.MediaRecorder) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new window.MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            let chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                setRecordings(prev => ({ ...prev, [questionId]: blob }));
                setAudioURLs(prev => ({ ...prev, [questionId]: URL.createObjectURL(blob) }));
                setIsRecording(false);
                setRecordingQuestionId(null);
            };
            mediaRecorder.start();
        } else {
            showError('Audio recording is not supported in this browser.');
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append('test_id', module._id);
            // Attach MCQ answers
            Object.entries(answers).forEach(([qid, ans]) => {
                formData.append(`answer_${qid}`, ans);
            });
            // Attach audio answers
            Object.entries(recordings).forEach(([qid, blob]) => {
                formData.append(`question_${qid}`, blob, `answer_${qid}.wav`);
            });
            const res = await api.post('/student/submit-practice-test', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                success("Module submitted successfully!");
                onSubmit(res.data.data); // Pass result data to parent
            } else {
                showError(res.data.message || 'Failed to submit your answers.');
            }
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to submit your answers. Please try again.');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (questions.length === 0) return <div className="text-center p-8">This module has no questions.</div>;

    const currentQuestion = questions[currentQuestionIndex];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 truncate">{module.name}</h1>
        </div>
        {cheatWarning && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
            <strong>Tab switching or leaving the exam is not allowed!</strong> ({cheatCount} warning{cheatCount > 1 ? 's' : ''})
          </div>
        )}
        <div ref={examRef} className="bg-white rounded-2xl shadow-lg mx-auto p-4 sm:p-8 max-w-md w-full min-h-[350px] flex flex-col justify-center select-none">
            <div className="text-center mb-6 text-sm font-semibold text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
            </div>

            <div className="text-center">
                {/* Listening Module: Play audio if available */}
                {currentQuestion.question_type === 'audio' && currentQuestion.audio_url && (
                    <audio controls className="mx-auto mb-4">
                        <source src={currentQuestion.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                )}
                <p className="text-lg sm:text-xl text-gray-800 mb-8 break-words">{currentQuestion.question}</p>
            </div>

            {currentQuestion.question_type === 'mcq' && (
                <div className="space-y-4 max-w-lg mx-auto w-full">
                    {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <label 
                            key={key} 
                            className={clsx(
                                "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all w-full",
                                {
                                    'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300': answers[currentQuestion.question_id] === key,
                                    'border-gray-200 hover:border-indigo-400': answers[currentQuestion.question_id] !== key,
                                }
                            )}
                        >
                            <input
                                type="radio"
                                name={currentQuestion.question_id}
                                value={key}
                                checked={answers[currentQuestion.question_id] === key}
                                onChange={() => handleAnswerChange(currentQuestion.question_id, key)}
                                className="h-5 w-5 mr-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <span className="font-semibold text-gray-700">{key}.</span>
                            <span className="ml-3 text-gray-800">{value}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Speaking Module: Record answer if no audio_url */}
            {currentQuestion.question_type === 'audio' && !currentQuestion.audio_url && (
                <div className="flex flex-col items-center mb-4">
                    {audioURLs[currentQuestion.question_id] ? (
                        <audio controls src={audioURLs[currentQuestion.question_id]} className="mb-2" />
                    ) : null}
                    {isRecording && recordingQuestionId === currentQuestion.question_id ? (
                        <button onClick={stopRecording} className="px-4 py-2 bg-red-600 text-white rounded">Stop Recording</button>
                    ) : (
                        <button onClick={() => startRecording(currentQuestion.question_id)} className="px-4 py-2 bg-blue-600 text-white rounded">Record Answer</button>
                    )}
                </div>
            )}

            <div className="mt-10 flex justify-between items-center">
                <button
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                {currentQuestionIndex === questions.length - 1 ? (
                    <button
                        onClick={handleSubmit}
                        disabled={Object.keys(answers).length !== questions.length}
                        className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                    >
                        Submit
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
      </motion.div>
    );
};


const ResultView = ({ result, onBack }) => {
    if (!result) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">An error occurred while calculating your results.</h1>
                <button onClick={onBack} className="mt-8 px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
                    Back to Modules
                </button>
            </div>
        )
    }
    
    const { correct_answers, total_questions, average_score, results } = result;
    const scorePercentage = average_score || 0;
    
    // Helper for word diff display
    const renderWordDiff = (expected, got) => {
        const expectedWords = expected.split(' ');
        const gotWords = got.split(' ');
        return (
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">Expected:</span>
                    {expectedWords.map((word, idx) => (
                        <span key={idx} className={gotWords[idx] === word ? 'bg-green-100 text-green-700 px-2 py-1 rounded flex items-center' : 'bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center'}>
                            {gotWords[idx] === word ? <>&#10003;&nbsp;</> : null}{word}
                        </span>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-semibold">Got:</span>
                    {gotWords.map((word, idx) => (
                        <span key={idx} className={expectedWords[idx] === word ? 'bg-green-100 text-green-700 px-2 py-1 rounded flex items-center' : 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center'}>
                            {expectedWords[idx] === word ? <>&#10003;&nbsp;</> : null}{word}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800">Module Complete!</h1>
                <p className="text-gray-600 mt-2">Here's how you did:</p>
                <div className="my-8">
                    <p className="text-6xl font-bold text-indigo-600">{correct_answers}<span className="text-4xl text-gray-500">/{total_questions}</span></p>
                    <p className="text-xl font-semibold text-gray-700">Questions Correct</p>
                </div>
                <div className="bg-gray-100 p-6 rounded-lg mb-8">
                    <h3 className="text-lg font-semibold">Your Score</h3>
                    <p className="text-4xl font-bold text-green-600 mt-2">{scorePercentage.toFixed(0)}%</p>
                </div>
                <div className="mt-8 text-left">
                    {results && results.map((q, idx) => (
                        <div key={idx} className="mb-8 p-6 rounded-xl shadow border bg-white">
                            <div className="mb-2 font-semibold text-indigo-700">Question {idx + 1}</div>
                            {q.question_type === 'audio' ? (
                                <>
                                    {/* Listening: Play question audio if available */}
                                    {q.audio_url && (
                                        <audio controls className="mb-2">
                                            <source src={q.audio_url} type="audio/mpeg" />
                                            Your browser does not support the audio element.
                                        </audio>
                                    )}
                                    <div className="mb-2"><span className="font-semibold">Prompt:</span> {q.original_text || q.question}</div>
                                    <div className="mb-2 text-green-700 font-semibold">Result: Similarity Score: {q.similarity_score}</div>
                                    <div className="mb-2">
                                        <span className="font-semibold">Detailed Diff:</span>
                                        <div className="border rounded p-2 mt-1 bg-gray-50">
                                            {renderWordDiff(q.original_text || q.question, q.student_text || '')}
            </div>
                                    </div>
                                    {/* Missing/Extra words */}
                                    {(q.missing_words && q.missing_words.length > 0) && (
                                        <div className="text-sm text-yellow-700 mt-1">Missing: {q.missing_words.join(', ')}</div>
                                    )}
                                    {(q.extra_words && q.extra_words.length > 0) && (
                                        <div className="text-sm text-blue-700 mt-1">Extra: {q.extra_words.join(', ')}</div>
                                    )}
                                    {/* Student's submitted audio */}
                                    {q.student_audio_url && (
                                        <div className="mt-2">
                                            <span className="font-semibold">Your Submitted Audio:</span>
                                            <audio controls className="mt-1">
                                                <source src={q.student_audio_url} type="audio/wav" />
                                                Your browser does not support the audio element.
                                            </audio>
                                </div>
                                    )}
                    </>
                ) : (
                                // MCQ
                                <>
                                    <div className="mb-2 font-semibold">{q.question}</div>
                                    <div className="mb-2">Your Answer: <span className={q.is_correct ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{q.student_answer}</span></div>
                                    <div className="mb-2">Correct Answer: <span className="font-semibold">{q.correct_answer}</span></div>
                                </>
                )}
            </div>
                    ))}
                </div>
                <button onClick={onBack} className="mt-8 px-8 py-3 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition">
                    Retry Practice Test
                </button>
            </div>
        </motion.div>
    );
};

export default PracticeModules;
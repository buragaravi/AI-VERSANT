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
    <h1 className="text-3xl font-bold text-gray-800 mb-8">Practice Modules</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {modules.map(module => (
        <motion.div
          key={module.id}
          whileHover={!module.locked ? { scale: 1.05 } : {}}
          className={clsx(
            "bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center text-center relative",
            {
              "cursor-pointer": !module.locked,
              "opacity-60 bg-gray-100 cursor-not-allowed": module.locked,
            }
          )}
          onClick={() => onSelectModule(module)}
        >
          {module.locked && (
            <div className="absolute top-4 right-4 bg-gray-300 p-2 rounded-full">
              <Lock className="h-5 w-5 text-gray-600" />
            </div>
          )}
          <module.icon className={clsx("h-20 w-20 mb-4", {
            "text-indigo-500": !module.locked,
            "text-gray-400": module.locked
          })} />
          <h2 className="text-2xl font-semibold text-gray-800">{module.name}</h2>
          <p className="text-gray-500 mt-2">Improve your {module.name.toLowerCase()} skills.</p>
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
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-4"><ChevronLeft /></button>
            <h1 className="text-3xl font-bold text-gray-800">{category.name} Modules</h1>
        </div>
        {modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map(module => (
                    <motion.div
                        key={module._id}
                        whileHover={{ scale: 1.05 }}
                        className="bg-white p-6 rounded-xl shadow-lg cursor-pointer flex flex-col justify-between"
                        onClick={() => onSelectModule(module)}
                    >
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{module.name}</h3>
                            <p className="text-gray-500 mt-2 text-sm">A practice module to test your skills.</p>
                        </div>
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${module.highest_score || 0}%` }}></div>
                            </div>
                            <p className="text-right text-sm text-gray-600 mt-1">Highest Score: {Math.round(module.highest_score || 0)}%</p>
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

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                test_id: module._id,
                answers: answers
            };
            const res = await api.post('/student/submit-test', payload);
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
            <h1 className="text-3xl font-bold text-gray-800">{module.name}</h1>
            <button onClick={onBack} className="text-sm font-medium text-gray-600 hover:text-indigo-600">
                &larr; Back to Module List
            </button>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6 text-sm font-semibold text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
            </div>

            <div className="text-center">
                <p className="text-xl text-gray-800 mb-8">{currentQuestion.question}</p>
            </div>

            {currentQuestion.question_type === 'mcq' && (
                <div className="space-y-4 max-w-lg mx-auto">
                    {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <label 
                            key={key} 
                            className={clsx(
                                "flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all",
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
    const correctOnly = results ? results.filter(item => item.is_correct) : [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800">Module Complete!</h1>
                <p className="text-gray-600 mt-2">Here's how you did:</p>
                
                <div className="my-8">
                    <p className="text-6xl font-bold text-indigo-600">{correct_answers}<span className="text-4xl text-gray-500">/{total_questions}</span></p>
                    <p className="text-xl font-semibold text-gray-700">Questions Correct</p>
                </div>

                <div className="bg-gray-100 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold">Your Score</h3>
                    <p className="text-4xl font-bold text-green-600 mt-2">{scorePercentage.toFixed(0)}%</p>
                    {scorePercentage >= 60 ? (
                        <p className="text-green-700 mt-2 flex items-center justify-center"><CheckCircle className="mr-2"/> Great job! You may have unlocked the next section.</p>
                    ): (
                        <p className="text-yellow-800 mt-2 flex items-center justify-center"><XCircle className="mr-2"/> Keep practicing! You need 60% to unlock the next section.</p>
                    )}
                </div>
            </div>

            <div className="mt-10">
                {correctOnly.length > 0 ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Correctly Answered Questions</h2>
                        <div className="space-y-4">
                            {correctOnly.map((item, index) => (
                                <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                                    <p className="font-semibold text-gray-800 mb-2">{item.question}</p>
                                    <div className="text-sm mt-2">
                                        <span className="font-semibold">Your Answer: </span>
                                        <span className="px-3 py-1 rounded-full bg-green-500 text-white">{item.student_answer}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500 text-lg">No correct answers this time. Keep practicing!</div>
                )}
            </div>

            <div className="text-center mt-10">
                <button onClick={onBack} className="px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
                    Back to Modules
                </button>
            </div>
        </motion.div>
    );
};

export default PracticeModules;
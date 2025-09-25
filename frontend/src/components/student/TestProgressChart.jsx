import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TestProgressChart = ({ attempts, testName }) => {
  // Debug logging
  console.log('TestProgressChart received attempts:', attempts);
  
  // Sort attempts by submission date to ensure proper chronological order
  const sortedAttempts = [...(attempts || [])].sort((a, b) => 
    new Date(a.submitted_at) - new Date(b.submitted_at)
  );

  // Prepare data for the chart - try different possible score field names
  const chartData = sortedAttempts.map((attempt, index) => {
    let score = 0;
    
    // Try different possible score field names in order of preference
    if (attempt.score !== undefined && attempt.score !== null) {
      score = attempt.score;
    } else if (attempt.score_percentage !== undefined && attempt.score_percentage !== null) {
      score = attempt.score_percentage;
    } else if (attempt.average_score !== undefined && attempt.average_score !== null) {
      score = attempt.average_score * 100;
    } else if (attempt.correct_answers !== undefined && attempt.total_questions !== undefined && attempt.total_questions > 0) {
      score = (attempt.correct_answers / attempt.total_questions) * 100;
    }
    
    // Ensure score is a valid number between 0-100
    score = Math.max(0, Math.min(100, parseFloat(score) || 0));
    
    console.log(`Attempt ${index + 1} score:`, score, 'from attempt:', attempt);
    
    return {
      attempt: index, // Start from 0 for X-axis
      score: score,
      date: new Date(attempt.submitted_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    };
  });

  // Always start from (0, 0) for proper trend visualization
  const finalChartData = [
    {
      attempt: 0,
      score: 0,
      date: 'Start'
    },
    ...chartData.map((item, index) => ({
      ...item,
      attempt: index + 1 // Ensure attempts are numbered 1, 2, 3, etc.
    }))
  ];

  console.log('Original attempts:', attempts);
  console.log('Processed chartData:', chartData);
  console.log('Final chart data:', finalChartData);
  console.log('Chart data length:', finalChartData.length);
  console.log('X-axis ticks:', finalChartData.map(item => item.attempt));
  console.log('Attempt values for X-axis:', finalChartData.map(item => ({ attempt: item.attempt, score: item.score })));

  // Calculate trend (skip the starting point at index 0)
  const getTrend = () => {
    if (finalChartData.length < 3) return 'stable'; // Need at least start + 1 attempt
    
    const attemptData = finalChartData.slice(1); // Skip the starting point
    if (attemptData.length < 2) return 'stable';
    
    const firstHalf = attemptData.slice(0, Math.ceil(attemptData.length / 2));
    const secondHalf = attemptData.slice(Math.floor(attemptData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + item.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + item.score, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  };

  // Determine chart theme based on last attempt vs highest score
  const getChartTheme = () => {
    if (finalChartData.length < 3) return 'stable'; // Need at least start + 1 attempt
    
    const attemptData = finalChartData.slice(1); // Skip the starting point
    if (attemptData.length < 2) return 'stable';
    
    const lastAttempt = attemptData[attemptData.length - 1];
    const highestScore = Math.max(...attemptData.map(item => item.score));
    
    if (lastAttempt.score >= highestScore) return 'improving';
    return 'declining';
  };

  const chartTheme = getChartTheme();
  
  // Debug theme calculation
  if (finalChartData.length >= 3) {
    const attemptData = finalChartData.slice(1);
    const lastAttempt = attemptData[attemptData.length - 1];
    const highestScore = Math.max(...attemptData.map(item => item.score));
    console.log('Theme calculation:', {
      lastAttempt: lastAttempt.score,
      highestScore: highestScore,
      theme: chartTheme
    });
  }
  
  const trendColor = chartTheme === 'improving' ? 'text-green-600' : 
                    chartTheme === 'declining' ? 'text-red-600' : 'text-gray-600';
  
  const trendIcon = chartTheme === 'improving' ? <TrendingUp className="w-3 h-3" /> :
                   chartTheme === 'declining' ? <TrendingDown className="w-3 h-3" /> :
                   <Minus className="w-3 h-3" />;

  const trendText = chartTheme === 'improving' ? 'Improving' :
                   chartTheme === 'declining' ? 'Declining' : 'Stable';

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = finalChartData.find(item => item.attempt === label);
      const attemptNumber = label === 0 ? 'Start' : `Attempt ${label}`;
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
          <p className="text-xs font-medium text-gray-900">
            {attemptNumber}
          </p>
          <p className="text-xs text-gray-600">
            Score: {payload[0].value.toFixed(1)}%
          </p>
          {dataPoint && dataPoint.date && dataPoint.date !== 'Start' && (
            <p className="text-xs text-gray-500">
              Date: {dataPoint.date}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (finalChartData.length === 1) { // Only starting point, no attempts
    return (
      <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
        No attempts yet
      </div>
    );
  }

  if (finalChartData.length === 2) { // Only start point + 1 attempt
    return (
      <div className="h-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {finalChartData[1].score.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">First attempt</div>
        </div>
      </div>
    );
  }

  // Check if all scores are 0 (which might indicate a data issue)
  const allScoresZero = finalChartData.every(item => item.score === 0);
  if (allScoresZero) {
    return (
      <div className="h-20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-500">No score data available</div>
          <div className="text-xs text-gray-400">{finalChartData.length - 1} attempt{(finalChartData.length - 1) !== 1 ? 's' : ''}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Trend indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <span className="text-xs font-medium text-gray-600">Progress:</span>
          <div className={`flex items-center space-x-1 ${trendColor}`}>
            {trendIcon}
            <span className="text-xs font-medium">{trendText}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {finalChartData.length - 1} attempt{(finalChartData.length - 1) !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 w-full bg-white rounded-lg border border-gray-200 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={finalChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="attempt" 
              tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              interval={0}
              type="category"
              scale="point"
              tickFormatter={(value) => value.toString()}
              axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
              tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              tickCount={6}
              ticks={[0, 20, 40, 60, 80, 100]}
              axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
              tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke={chartTheme === 'improving' ? '#059669' : chartTheme === 'declining' ? '#dc2626' : '#6b7280'}
              strokeWidth={2.5}
              dot={{ 
                fill: chartTheme === 'improving' ? '#059669' : chartTheme === 'declining' ? '#dc2626' : '#6b7280', 
                strokeWidth: 2, 
                r: 4,
                stroke: '#fff'
              }}
              activeDot={{ 
                r: 6, 
                stroke: chartTheme === 'improving' ? '#059669' : chartTheme === 'declining' ? '#dc2626' : '#6b7280', 
                strokeWidth: 2,
                fill: '#fff'
              }}
              connectNulls={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TestProgressChart;

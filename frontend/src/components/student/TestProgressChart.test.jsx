import React from 'react';
import { render } from '@testing-library/react';
import TestProgressChart from './TestProgressChart';

// Mock recharts to avoid issues in test environment
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
}));

describe('TestProgressChart', () => {
  const mockAttempts = [
    {
      attempt_id: '1',
      score: 35.0,
      submitted_at: '2024-01-01T10:00:00Z',
      correct_answers: 7,
      total_questions: 20
    },
    {
      attempt_id: '2', 
      score: 32.5,
      submitted_at: '2024-01-02T10:00:00Z',
      correct_answers: 6,
      total_questions: 20
    },
    {
      attempt_id: '3',
      score: 40.0,
      submitted_at: '2024-01-03T10:00:00Z',
      correct_answers: 8,
      total_questions: 20
    }
  ];

  it('renders chart with proper data', () => {
    const { getByTestId } = render(
      <TestProgressChart attempts={mockAttempts} testName="Test" />
    );
    
    expect(getByTestId('line-chart')).toBeInTheDocument();
  });

  it('handles empty attempts array', () => {
    const { getByText } = render(
      <TestProgressChart attempts={[]} testName="Test" />
    );
    
    expect(getByText('No attempts yet')).toBeInTheDocument();
  });

  it('handles single attempt', () => {
    const singleAttempt = [mockAttempts[0]];
    const { getByText } = render(
      <TestProgressChart attempts={singleAttempt} testName="Test" />
    );
    
    expect(getByText('35.0%')).toBeInTheDocument();
    expect(getByText('First attempt')).toBeInTheDocument();
  });
});

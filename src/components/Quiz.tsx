'use client';

import React, { useEffect, useState } from 'react';
//@ts-ignore
import Quiz from 'react-quiz-component';

interface QuizComponentProps {
  url: string;
}

const QuizComponent: React.FC<QuizComponentProps> = ({ url }) => {
  console.log('QuizComponent rendered with url:', url);

  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        console.log('Fetching quiz from:', url);
        const response = await fetch(url);
        console.log('Fetch response:', response);
        if (!response.ok) {
          throw new Error(`Failed to fetch quiz: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Quiz data loaded:', data);
        setQuizData(data);
      } catch (err) {
        console.error('Failed to fetch quiz data', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [url]);

  if (loading) {
    return <div className="quiz-loading">Loading quiz...</div>;
  }

  if (error) {
    return <div className="quiz-error">Error loading quiz: {error}</div>;
  }

  if (!quizData) {
    return <div className="quiz-error">No quiz data available</div>;
  }

  return (
    <div className="quiz-container">
      <Quiz quiz={quizData} shuffle={true} />
    </div>
  );
};

export default QuizComponent;

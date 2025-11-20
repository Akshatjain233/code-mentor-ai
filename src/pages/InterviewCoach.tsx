import React, { useState, useRef, useEffect } from 'react';
import { Send, Code, RotateCcw, CheckCircle } from 'lucide-react';

const SYSTEM_PROMPT = `You are an Adaptive LeetCode Interviewer AI for an AI Interview Coach platform.
Your job:
- Ask one coding question at a time.
- Evaluate the user's answer.
- Automatically increase or decrease difficulty based on performance.
===================================
DIFFICULTY MODES
===================================
BEGINNER MODE (EASY LEETCODE)
Focus on:
- Arrays, Strings, Basic hashing
- Two-pointer easy problems
- Simple recursion, Easy math problems
Examples: Two Sum, Reverse a string, Check if two strings are anagrams, Find maximum in an array, Move zeros to end

Switch to INTERMEDIATE MODE when:
- User gives **3 correct answers in a row** in BEGINNER mode

INTERMEDIATE MODE (MEDIUM LEETCODE)
Focus on:
- Medium array/string problems
- Basic DP, Hash maps
- Binary search, Stack/Queue problems
Examples: Longest substring without repeating, Group anagrams, 3Sum, Container with most water

Switch to ADVANCED MODE when:
- User gives **3 correct answers in a row** in INTERMEDIATE mode

ADVANCED MODE (HARD LEETCODE)
Focus on:
- Advanced DP, Backtracking
- Graph algorithms, Tree/Trie problems
- Greedy + edge cases, Optimization problems
Examples: Number of islands, Coin change, Median of two sorted arrays, Word break, Kth smallest element in BST

Switch back down when:
- User gives **2 weak or incorrect answers in a row**
===================================
HOW YOU MUST OPERATE
===================================
1. Ask ONE DSA/LeetCode-style question according to current difficulty.
2. Provide: Problem statement, Constraints, Example input/output, Expected time/space complexity
3. Wait for user's answer.
4. Evaluate answer as: strong / acceptable / weak.
5. Provide brief feedback on their solution.
6. If difficulty changes, announce it clearly: "🎯 Level Up! Moving to [DIFFICULTY] mode" or "📉 Let's review fundamentals. Moving to [DIFFICULTY] mode"
7. Ask the next question.
===================================
QUESTION FORMAT
===================================
For every question provide:
**Problem:** [Clear problem statement]
**Example:**
Input: [example]
Output: [example]
**Constraints:** [constraints]
**Expected Complexity:** Time O(?), Space O(?)

Keep questions UNIQUE (no repeats).
===================================
IMPORTANT
===================================
- Start in the mode chosen by user (BEGINNER/INTERMEDIATE/ADVANCED).
- Do NOT give solutions unless the user explicitly asks.
- Track performance: 3 good answers = level up, 2 bad answers = level down
- Encourage and guide the user like a mentor.
- Be supportive but honest in feedback.`;

export default function InterviewCoach() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [question, setQuestion] = useState('');
  const [solution, setSolution] = useState('');
  const [feedback, setFeedback] = useState<Array<{ solution: string; response: string; timestamp: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [stats, setStats] = useState({ correct: 0, streak: 0 });
  
  const feedbackEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedback]);

  const startSession = async (level: string) => {
    setSelectedLevel(level);
    setCurrentLevel(level);
    setSessionStarted(true);
    setLoading(true);
    
    const initialMessage = `Start the interview session at ${level} level. Give me the first question.`;
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: initialMessage }],
        }),
      });

      const data = await response.json();
      const aiResponse = data.content?.find((c: any) => c.type === 'text')?.text || 'Error starting session';
      
      setQuestion(aiResponse);
      setConversationHistory([
        { role: 'user', content: initialMessage },
        { role: 'assistant', content: aiResponse }
      ]);
      extractLevel(aiResponse);
    } catch (error) {
      setQuestion('Error connecting to AI Interview Coach. Please add your Anthropic API key.');
    } finally {
      setLoading(false);
    }
  };

  const extractLevel = (text: string) => {
    const upperText = text.toUpperCase();
    if (upperText.includes('ADVANCED MODE') || upperText.includes('HARD')) {
      setCurrentLevel('ADVANCED');
    } else if (upperText.includes('INTERMEDIATE MODE') || upperText.includes('MEDIUM')) {
      setCurrentLevel('INTERMEDIATE');
    } else if (upperText.includes('BEGINNER MODE') || upperText.includes('EASY')) {
      setCurrentLevel('BEGINNER');
    }
  };

  const submitSolution = async () => {
    if (!solution.trim() || loading) return;

    setLoading(true);
    const userMessage = { role: 'user', content: `Here is my solution:\n\n${solution}` };
    const updatedHistory = [...conversationHistory, userMessage];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: updatedHistory,
        }),
      });

      const data = await response.json();
      const aiResponse = data.content?.find((c: any) => c.type === 'text')?.text || 'Error processing response';
      
      const newFeedback = {
        solution: solution,
        response: aiResponse,
        timestamp: new Date().toLocaleTimeString()
      };

      setFeedback([...feedback, newFeedback]);
      setQuestion(aiResponse);
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: aiResponse }
      ]);
      
      extractLevel(aiResponse);
      
      if (aiResponse.toLowerCase().includes('correct') || aiResponse.toLowerCase().includes('strong') || aiResponse.includes('✓')) {
        setStats(prev => ({ correct: prev.correct + 1, streak: prev.streak + 1 }));
      } else if (aiResponse.toLowerCase().includes('incorrect') || aiResponse.toLowerCase().includes('weak')) {
        setStats(prev => ({ ...prev, streak: 0 }));
      }
      
      setSolution('');
    } catch (error) {
      setFeedback([...feedback, {
        solution: solution,
        response: 'Error submitting solution. Please check your API key.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setSessionStarted(false);
    setSelectedLevel(null);
    setCurrentLevel('');
    setQuestion('');
    setSolution('');
    setFeedback([]);
    setConversationHistory([]);
    setStats({ correct: 0, streak: 0 });
  };

  const getLevelBg = (level: string) => {
    switch(level) {
      case 'BEGINNER': return 'bg-success';
      case 'INTERMEDIATE': return 'bg-warning';
      case 'ADVANCED': return 'bg-danger';
      default: return 'bg-primary';
    }
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Code className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Coding Interview Coach</h1>
            </div>
            <p className="text-muted-foreground">Practice coding problems with AI feedback</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8">
            <label className="block text-sm font-medium text-foreground mb-4">
              Select Difficulty Level
            </label>
            
            <div className="space-y-4 mb-8">
              <button
                onClick={() => startSession('BEGINNER')}
                className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                  selectedLevel === 'BEGINNER'
                    ? 'border-success bg-success/10'
                    : 'border-border hover:border-success/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground mb-1">Beginner</div>
                    <div className="text-sm text-muted-foreground">Arrays, strings, basic algorithms</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-success" />
                </div>
              </button>

              <button
                onClick={() => startSession('INTERMEDIATE')}
                className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                  selectedLevel === 'INTERMEDIATE'
                    ? 'border-warning bg-warning/10'
                    : 'border-border hover:border-warning/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground mb-1">Intermediate</div>
                    <div className="text-sm text-muted-foreground">Binary search, DP, stacks & queues</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-warning" />
                </div>
              </button>

              <button
                onClick={() => startSession('ADVANCED')}
                className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all ${
                  selectedLevel === 'ADVANCED'
                    ? 'border-danger bg-danger/10'
                    : 'border-border hover:border-danger/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground mb-1">Advanced</div>
                    <div className="text-sm text-muted-foreground">Graph algorithms, advanced DP, complex trees</div>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-danger" />
                </div>
              </button>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-2">Starting session...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[1920px] mx-auto">
        <header className="bg-card border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code className="w-7 h-7 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Coding Interview Coach</h1>
                  <p className="text-muted-foreground text-xs">AI-powered practice</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${getLevelBg(currentLevel)} px-4 py-2 rounded-lg`}>
                  <span className="text-white font-semibold text-sm">{currentLevel}</span>
                </div>
                
                <div className="bg-card px-4 py-2 rounded-lg border border-border">
                  <span className="text-muted-foreground text-xs">Streak: </span>
                  <span className="text-foreground font-semibold text-sm">{stats.streak}</span>
                </div>
                
                <button
                  onClick={resetSession}
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-0">
          <div className="bg-card border-r border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${getLevelBg(currentLevel)}`} />
              <h2 className="text-lg font-semibold text-foreground">Problem</h2>
            </div>
            
            <div className="bg-muted/30 border border-border rounded-lg p-4 h-[calc(100vh-200px)] overflow-y-auto">
              {loading && !question ? (
                <div className="flex items-center justify-center h-full">
                  <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {question}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Solution</h2>
              <button
                onClick={submitSolution}
                disabled={loading || !solution.trim()}
                className={`${getLevelBg(currentLevel)} text-white px-5 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                <Send className="w-4 h-4" />
                Submit
              </button>
            </div>

            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Write your solution here..."
              className="w-full h-64 bg-muted/30 border border-border text-foreground rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm resize-none mb-4"
              disabled={loading}
            />

            <div className="bg-muted/30 border border-border rounded-lg p-4 h-[calc(100vh-520px)] overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground">Feedback</h3>
              </div>
              
              {feedback.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Submit a solution to see feedback here
                </p>
              ) : (
                <div className="space-y-3">
                  {feedback.map((item, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-2">{item.timestamp}</div>
                      
                      <div className="mb-3 p-3 bg-muted/50 rounded border-l-2 border-primary">
                        <div className="text-xs text-muted-foreground mb-1">Your solution:</div>
                        <div className="text-foreground text-xs whitespace-pre-wrap font-mono">
                          {item.solution.length > 100 ? item.solution.substring(0, 100) + '...' : item.solution}
                        </div>
                      </div>
                      
                      <div className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                        {item.response}
                      </div>
                    </div>
                  ))}
                  <div ref={feedbackEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
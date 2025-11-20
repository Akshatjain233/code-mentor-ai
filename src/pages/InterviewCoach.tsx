import React, { useState, useRef, useEffect } from 'react';
import { Send, Code, TrendingUp, TrendingDown, RotateCcw, CheckCircle, Sparkles, Zap, Trophy } from 'lucide-react';

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
          'x-api-key': 'YOUR_API_KEY', // User needs to add their API key
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
          'x-api-key': 'YOUR_API_KEY', // User needs to add their API key
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

  const getLevelGradient = (level: string) => {
    switch(level) {
      case 'BEGINNER': return 'from-success via-success to-emerald-500';
      case 'INTERMEDIATE': return 'from-warning via-warning to-amber-500';
      case 'ADVANCED': return 'from-danger via-danger to-pink-500';
      default: return 'from-primary via-primary to-accent';
    }
  };

  const getLevelIcon = (level: string) => {
    switch(level) {
      case 'BEGINNER': return <Sparkles className="w-5 h-5" />;
      case 'INTERMEDIATE': return <Code className="w-5 h-5" />;
      case 'ADVANCED': return <Zap className="w-5 h-5" />;
      default: return <Code className="w-5 h-5" />;
    }
  };

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-6xl relative z-10 animate-fade-in">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary blur-xl opacity-50 animate-glow-pulse" />
                <Code className="w-16 h-16 text-primary relative z-10" />
              </div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                AI Interview Coach
              </h1>
            </div>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Master coding interviews with adaptive AI guidance that evolves with your performance
            </p>
          </div>

          {/* Level Selection Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Beginner Card */}
            <div 
              onClick={() => startSession('BEGINNER')}
              className="group relative bg-card-glass backdrop-blur-xl rounded-2xl p-8 border border-border hover:border-success transition-all duration-500 cursor-pointer overflow-hidden transform hover:scale-105 hover:shadow-elevated animate-fade-in"
            >
              <div className="absolute inset-0 bg-gradient-success opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-success blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
                    <div className="bg-gradient-success p-5 rounded-2xl relative">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-foreground text-center mb-4">Beginner</h3>
                <p className="text-muted-foreground text-center mb-6 text-sm leading-relaxed">
                  Perfect for starting out with fundamentals and building confidence
                </p>
                
                <ul className="space-y-3 mb-8">
                  {['Arrays & Strings', 'Basic Hashing', 'Two Pointers', 'Simple Recursion'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-muted-foreground text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                
                <button className="w-full bg-gradient-success text-white py-4 rounded-xl font-semibold hover:shadow-glow transition-all duration-300 group-hover:scale-105">
                  Start Learning
                </button>
              </div>
            </div>

            {/* Intermediate Card */}
            <div 
              onClick={() => startSession('INTERMEDIATE')}
              className="group relative bg-card-glass backdrop-blur-xl rounded-2xl p-8 border-2 border-warning hover:border-warning transition-all duration-500 cursor-pointer overflow-hidden transform hover:scale-105 hover:shadow-elevated animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="absolute inset-0 bg-gradient-warning opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
              
              {/* Popular Badge */}
              <div className="absolute top-4 right-4 bg-gradient-warning text-warning-foreground px-4 py-1 rounded-full text-xs font-bold">
                POPULAR
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-warning blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
                    <div className="bg-gradient-warning p-5 rounded-2xl relative">
                      <Code className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-foreground text-center mb-4">Intermediate</h3>
                <p className="text-muted-foreground text-center mb-6 text-sm leading-relaxed">
                  Build on your foundation with medium-level problem solving
                </p>
                
                <ul className="space-y-3 mb-8">
                  {['Binary Search', 'Basic DP', 'Stack & Queues', 'Hash Maps'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-muted-foreground text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                      {item}
                    </li>
                  ))}
                </ul>
                
                <button className="w-full bg-gradient-warning text-warning-foreground py-4 rounded-xl font-semibold hover:shadow-glow transition-all duration-300 group-hover:scale-105">
                  Start Advancing
                </button>
              </div>
            </div>

            {/* Advanced Card */}
            <div 
              onClick={() => startSession('ADVANCED')}
              className="group relative bg-card-glass backdrop-blur-xl rounded-2xl p-8 border border-border hover:border-danger transition-all duration-500 cursor-pointer overflow-hidden transform hover:scale-105 hover:shadow-elevated animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="absolute inset-0 bg-gradient-danger opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-danger blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />
                    <div className="bg-gradient-danger p-5 rounded-2xl relative">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-foreground text-center mb-4">Advanced</h3>
                <p className="text-muted-foreground text-center mb-6 text-sm leading-relaxed">
                  Challenge yourself with hard problems and complex algorithms
                </p>
                
                <ul className="space-y-3 mb-8">
                  {['Advanced DP', 'Graph Algorithms', 'Backtracking', 'Complex Trees'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-muted-foreground text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-danger" />
                      {item}
                    </li>
                  ))}
                </ul>
                
                <button className="w-full bg-gradient-danger text-white py-4 rounded-xl font-semibold hover:shadow-glow transition-all duration-300 group-hover:scale-105">
                  Start Mastering
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[1920px] mx-auto">
        {/* Header */}
        <header className="bg-card-glass backdrop-blur-xl border-b border-border sticky top-0 z-50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary blur-lg opacity-50" />
                  <Code className="w-8 h-8 text-primary relative z-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">AI Interview Coach</h1>
                  <p className="text-muted-foreground text-xs">Master coding interviews with adaptive AI</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-3 bg-gradient-to-r ${getLevelGradient(currentLevel)} px-6 py-3 rounded-xl shadow-glow`}>
                  {getLevelIcon(currentLevel)}
                  <span className="text-white font-bold tracking-wide">{currentLevel}</span>
                </div>
                
                <div className="bg-card border border-border px-5 py-3 rounded-xl flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-primary" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Streak: </span>
                    <span className="text-foreground font-bold text-lg">{stats.streak}</span>
                  </div>
                </div>
                
                <button
                  onClick={resetSession}
                  className="bg-muted text-foreground px-5 py-3 rounded-xl hover:bg-muted/80 transition-all flex items-center gap-2 font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-0 h-[calc(100vh-89px)]">
          {/* Question Panel */}
          <div className="bg-card-glass backdrop-blur-xl border-r border-border p-8 overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getLevelGradient(currentLevel)} animate-pulse`} />
              <h2 className="text-2xl font-bold text-foreground">Problem Statement</h2>
            </div>
            
            <div className="bg-muted/30 backdrop-blur-sm rounded-2xl p-8 border border-border flex-1 overflow-y-auto">
              {loading && !question ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex gap-3">
                    {[0, 1, 2].map((i) => (
                      <div 
                        key={i}
                        className="w-4 h-4 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-foreground whitespace-pre-wrap leading-relaxed font-mono text-sm">
                  {question}
                </div>
              )}
            </div>
          </div>

          {/* Solution Panel */}
          <div className="bg-card-glass backdrop-blur-xl p-8 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Solution</h2>
              <button
                onClick={submitSolution}
                disabled={loading || !solution.trim()}
                className={`bg-gradient-to-r ${getLevelGradient(currentLevel)} text-white px-8 py-3 rounded-xl font-semibold hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 disabled:hover:shadow-none`}
              >
                <Send className="w-5 h-5" />
                Submit Solution
              </button>
            </div>

            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="// Write your solution here...
// Explain your approach, provide code, or describe your algorithm

function solution() {
  // Your code
}"
              className="w-full h-80 bg-muted/30 backdrop-blur-sm text-foreground border border-border rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm resize-none mb-6 transition-all"
              disabled={loading}
            />

            {/* Feedback Section */}
            <div className="bg-muted/30 backdrop-blur-sm rounded-2xl border border-border p-6 flex-1 overflow-y-auto">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-success" />
                Feedback History
              </h3>
              
              {feedback.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Submit your first solution to see feedback here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedback.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="bg-card rounded-xl p-5 border border-border hover:border-primary/50 transition-all animate-fade-in"
                    >
                      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {item.timestamp}
                      </div>
                      <div className="text-foreground/80 text-sm mb-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary font-mono">
                        {item.solution.length > 150 ? item.solution.substring(0, 150) + '...' : item.solution}
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

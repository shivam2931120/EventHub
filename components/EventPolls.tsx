'use client';

import { useState, useEffect } from 'react';
import { useToast } from './Toaster';

interface Question {
    id: string;
    eventId: string;
    question: string;
    askerName: string;
    type: 'poll' | 'qna';
    options?: string[];
    votes?: number[];
    answers?: { text: string; authorName: string; createdAt: string }[];
    approved: boolean;
    featured: boolean;
    answered: boolean;
    upvotes: number;
    createdAt: string;
}

interface EventPollsProps {
    eventId: string;
}

export default function EventPolls({ eventId }: EventPollsProps) {
    const { showToast } = useToast();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'qna' | 'polls'>('polls');
    const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());

    const fetchQuestions = async () => {
        try {
            const res = await fetch(`/api/polls?eventId=${eventId}`);
            const data = await res.json();
            // Only show approved questions
            setQuestions((data.questions || []).filter((q: Question) => q.approved));
        } catch (err) {
            console.error('Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuestions();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchQuestions, 10000);
        return () => clearInterval(interval);
    }, [eventId]);

    const handleVote = async (questionId: string, optionIndex: number) => {
        if (votedPolls.has(questionId)) {
            showToast('You already voted on this poll', 'info');
            return;
        }

        try {
            await fetch('/api/polls', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, action: 'vote', data: { optionIndex } }),
            });
            setVotedPolls(new Set([...votedPolls, questionId]));
            fetchQuestions();
            showToast('Vote recorded!', 'success');
        } catch (err) {
            showToast('Vote failed', 'error');
        }
    };

    const handleUpvote = async (questionId: string) => {
        try {
            await fetch('/api/polls', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, action: 'upvote' }),
            });
            fetchQuestions();
        } catch (err) {
            console.error('Upvote failed');
        }
    };

    const filteredQuestions = questions.filter(q =>
        activeTab === 'qna' ? q.type === 'qna' : q.type === 'poll'
    );

    const getTotalVotes = (votes: number[] = []) => votes.reduce((a, b) => a + b, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (questions.length === 0) {
        return null; // Don't show the section if no polls/questions
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Live Engagement
                </h3>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-zinc-800/50 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('polls')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'polls' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Polls ({questions.filter(q => q.type === 'poll').length})
                </button>
                <button
                    onClick={() => setActiveTab('qna')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'qna' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Q&A ({questions.filter(q => q.type === 'qna').length})
                </button>
            </div>

            {/* Questions/Polls List */}
            <div className="space-y-3">
                {filteredQuestions.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm">
                        No {activeTab === 'polls' ? 'polls' : 'questions'} yet
                    </div>
                ) : (
                    filteredQuestions.map((q) => (
                        <div
                            key={q.id}
                            className={`bg-zinc-800/50 border rounded-xl p-4 ${q.featured ? 'border-yellow-500/50' : 'border-zinc-700/50'
                                }`}
                        >
                            {/* Featured Badge */}
                            {q.featured && (
                                <div className="flex items-center gap-1 text-yellow-400 text-xs mb-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                    Featured
                                </div>
                            )}

                            {/* Question Text */}
                            <p className="text-white font-medium mb-3">{q.question}</p>

                            {/* Poll Options */}
                            {q.type === 'poll' && q.options && (
                                <div className="space-y-2 mb-3">
                                    {q.options.map((option, idx) => {
                                        const total = getTotalVotes(q.votes);
                                        const percent = total > 0 ? ((q.votes?.[idx] || 0) / total * 100) : 0;
                                        const hasVoted = votedPolls.has(q.id);

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => !hasVoted && handleVote(q.id, idx)}
                                                disabled={hasVoted}
                                                className={`w-full relative overflow-hidden rounded-lg p-3 text-left transition-all ${hasVoted
                                                        ? 'bg-zinc-700 cursor-default'
                                                        : 'bg-zinc-700 hover:bg-zinc-600 cursor-pointer'
                                                    }`}
                                            >
                                                <div
                                                    className="absolute inset-0 bg-red-600/30 transition-all"
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                                <div className="relative flex justify-between items-center">
                                                    <span className="text-white text-sm">{option}</span>
                                                    <span className="text-zinc-400 text-sm font-medium">{percent.toFixed(0)}%</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                    <p className="text-xs text-zinc-500 text-center">{getTotalVotes(q.votes)} votes</p>
                                </div>
                            )}

                            {/* Q&A Answers */}
                            {q.type === 'qna' && q.answers && q.answers.length > 0 && (
                                <div className="space-y-2 pl-3 border-l-2 border-green-600">
                                    {q.answers.map((ans, idx) => (
                                        <div key={idx} className="bg-green-900/20 rounded-lg p-3">
                                            <p className="text-green-300 text-sm">{ans.text}</p>
                                            <p className="text-xs text-green-500 mt-1">— {ans.authorName}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upvote for unanswered Q&A */}
                            {q.type === 'qna' && !q.answered && (
                                <button
                                    onClick={() => handleUpvote(q.id)}
                                    className="flex items-center gap-1 text-zinc-400 hover:text-red-400 text-sm mt-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    <span>{q.upvotes} upvotes</span>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

'use client'

import React, { useState, useRef, useEffect, FormEvent, useCallback, useMemo } from 'react';
import { Post, PostContent, Platform } from '../../types';
import { PLATFORMS } from '../../constants';
import { Send, Bot, User, Loader2, CheckCircle, PlusCircle, History, PanelLeftClose, Trash2, Paperclip, Mic, MicOff, Image as ImageIcon, FileText, X, Sparkles, Lightbulb, BookOpen, ChevronRight } from 'lucide-react';
import { ThreadService, ChatMessage, ContentThread } from '../../lib/api/services';
import { useAuth } from '../../contexts/AuthContext';
import { aiService } from '../../lib/api/services';

interface ContentStrategistViewProps {
    onPostCreated: (post: Post) => void;
}

type Message = {
    role: 'user' | 'model' | 'system';
    content: string;
    postData?: any;
    attachments?: Array<{
        type: 'image' | 'file';
        name: string;
        url: string;
        size?: number;
    }>;
    generatedImage?: string; // AI-generated image URL
    generatedVideo?: string; // AI-generated video URL
    isGeneratingMedia?: boolean; // Loading state for media generation
};

const ContentStrategistView: React.FC<ContentStrategistViewProps> = ({ onPostCreated }) => {
    const { workspaceId, user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: "Hello! I'm Aamir your AI Content Strategist. What brilliant idea or product are we working on today?" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [chatHistory, setChatHistory] = useState<ContentThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | 'new'>('new');
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [isSavingThread, setIsSavingThread] = useState(false);
    const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<Array<{type: 'image' | 'file', name: string, url: string, size: number}>>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [showUploadMenu, setShowUploadMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const hasLoadedHistory = useRef(false);
    const isMountedRef = useRef(false);
    
    // Use refs to prevent unnecessary re-runs of effects when auth context updates
    const workspaceIdRef = useRef(workspaceId);
    const userRef = useRef(user);
    const isInitializedRef = useRef(false);
    
    // Mark component as mounted on first render
    useEffect(() => {
        isMountedRef.current = true;
        console.log('[ContentStrategist] Component mounted');
        return () => {
            isMountedRef.current = false;
            console.log('[ContentStrategist] Component unmounted');
        };
    }, []);
    
    // Update refs when values change (optimized to prevent re-renders)
    useEffect(() => {
        const workspaceChanged = workspaceIdRef.current !== workspaceId;
        const userChanged = userRef.current !== user;
        
        // Only update if values actually changed
        if (workspaceChanged) {
            workspaceIdRef.current = workspaceId;
            console.log('[ContentStrategist] Workspace updated:', workspaceId);
        }
        
        if (userChanged) {
            userRef.current = user;
            console.log('[ContentStrategist] User updated');
        }
        
        // Mark as initialized once we have both values
        if (workspaceId && user && !isInitializedRef.current) {
            isInitializedRef.current = true;
            console.log('[ContentStrategist] Component initialized');
        }
    }, [workspaceId, user]);

    // Load chat history lazily when history panel is opened
    useEffect(() => {
        if (!isHistoryVisible || hasLoadedHistory.current) return;
        
        // Use refs to avoid re-triggering when auth updates
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (!currentWorkspaceId || !currentUser) return;
        
        const loadChatHistory = async () => {
            hasLoadedHistory.current = true;
            console.log('[ContentStrategist] Loading chat history');
            try {
                const result = await ThreadService.getAllThreads(50, 0);
                setChatHistory(result.items);
            } catch (e) {
                console.error("Could not load chat history from database", e);
            }
        };
        
        loadChatHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHistoryVisible]);

    // Track component visibility to optimize performance
    const isVisibleRef = useRef(true);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Simplified visibility tracking - no re-renders
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden;
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Scroll to bottom when messages change (optimized)
    useEffect(() => {
        if (!isLoading && chatContainerRef.current) {
            const scrollTimer = setTimeout(() => {
                chatContainerRef.current?.scrollTo({ 
                    top: chatContainerRef.current.scrollHeight, 
                    behavior: 'smooth' 
                });
            }, 150);
            return () => clearTimeout(scrollTimer);
        }
    }, [messages.length, isLoading]);

    // Auto-save messages to database after each exchange with longer debounce
    useEffect(() => {
        // Skip save if component not mounted, no messages, viewing history, loading, or creating new chat
        if (!isMountedRef.current || !currentThreadId || messages.length === 0 || activeThreadId !== 'new' || isLoading || isCreatingNewChat) {
            return;
        }
        
        // Use refs to avoid re-triggering when auth updates
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (!currentWorkspaceId || !currentUser) {
            return;
        }

        const saveMessages = async () => {
            // Double-check component is still mounted before saving
            if (!isMountedRef.current) return;
            
            try {
                const dbMessages: ChatMessage[] = messages
                    .filter(m => m.role !== 'system') // Don't save system messages to DB
                    .map(m => ({
                        role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                        content: m.content,
                        timestamp: new Date().toISOString(),
                    }));

                await ThreadService.updateMessages(currentThreadId, dbMessages);
                console.log('[ContentStrategist] Auto-saved messages');
            } catch (e) {
                console.error("Error saving messages to database", e);
            }
        };

        // Increase debounce to 15 seconds to reduce frequent saves and re-renders
        const saveTimer = setTimeout(saveMessages, 15000);
        return () => clearTimeout(saveTimer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length, currentThreadId, activeThreadId]);

    const saveCurrentChat = useCallback(async () => {
        const currentWorkspaceId = workspaceIdRef.current;
        const currentUser = userRef.current;
        
        if (messages.length <= 1 || !currentWorkspaceId || !currentUser) return;

        const firstUserMessage = messages.find(m => m.role === 'user');
        const title = firstUserMessage
            ? firstUserMessage.content.substring(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '')
            : 'Untitled Chat';

        try {
            setIsSavingThread(true);
            const newThread = await ThreadService.createThread(title);

            // Save messages to the new thread
            const dbMessages: ChatMessage[] = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                    content: m.content,
                    timestamp: new Date().toISOString(),
                }));

            await ThreadService.updateMessages(newThread.id, dbMessages);

            // Update local history
            setChatHistory(prevHistory => [newThread, ...prevHistory]);
        } catch (e) {
            console.error("Error saving chat to database", e);
            setError("Failed to save chat history");
        } finally {
            setIsSavingThread(false);
        }
    }, [messages]);

    const startNewChat = useCallback(async (isInitialLoad = false) => {
        try {
            setIsCreatingNewChat(true);
            
            // Save current chat if it has meaningful content
            if (!isInitialLoad && activeThreadId === 'new' && messages.length > 1) {
                await saveCurrentChat();
            }

            // Reset to initial state
            setMessages([
                { role: 'model', content: "Hello! I'm Aamir your AI Content Strategist. What brilliant idea or product are we working on today?" }
            ]);
            setActiveThreadId('new');
            setCurrentThreadId(null);
            setError(null);

            // Create a new thread in database for this chat session
            const currentWorkspaceId = workspaceIdRef.current;
            const currentUser = userRef.current;
            
            if (currentWorkspaceId && currentUser && !isInitialLoad) {
                try {
                    const newThread = await ThreadService.createThread('New Chat');
                    setCurrentThreadId(newThread.id);
                    console.log('[ContentStrategist] New thread created:', newThread.id);
                } catch (e) {
                    console.error("Error creating thread", e);
                    // Don't block the UI if thread creation fails
                    setError("Note: Thread creation failed, but you can still chat");
                }
            }
        } finally {
            setIsCreatingNewChat(false);
        }
    }, [activeThreadId, messages.length, saveCurrentChat]);

    const handleSelectThread = useCallback(async (thread: ContentThread) => {
        if (activeThreadId === 'new') {
            await saveCurrentChat();
        }

        // Convert database messages back to UI format
        const uiMessages = thread.messages.map((msg: ChatMessage) => ({
            role: (msg.role === 'assistant' ? 'model' : msg.role) as 'user' | 'model' | 'system',
            content: msg.content,
        }));

        setMessages(uiMessages);
        setActiveThreadId(thread.id);
        setCurrentThreadId(thread.id);
        setIsLoading(false);
    }, [activeThreadId, saveCurrentChat]);

    const handleDeleteThread = useCallback(async (e: React.MouseEvent, threadId: string) => {
        e.stopPropagation();

        const currentWorkspaceId = workspaceIdRef.current;
        if (!currentWorkspaceId) return;

        if (!confirm('Are you sure you want to delete this thread?')) return;

        try {
            await ThreadService.deleteThread(threadId);
            setChatHistory(prevHistory => prevHistory.filter(t => t.id !== threadId));

            // If we deleted the active thread, start a new chat
            if (activeThreadId === threadId) {
                await startNewChat();
            }
        } catch (e) {
            console.error("Error deleting thread", e);
            setError("Failed to delete thread");
        }
    }, [activeThreadId, startNewChat]);

    const handleCreatePost = useCallback((postData: any) => {
        const { topic, postType, imageSuggestion, videoSuggestion, ...platformContent } = postData;

        // Extract valid platforms from the generated content
        const platforms = Object.keys(platformContent).filter(
            key => PLATFORMS.some(p => p.id === key)
        ) as Platform[];

        if (platforms.length === 0) {
            setError("The generated content didn't specify any valid platforms.");
            return;
        }

        // Build content object with proper structure for each platform
        const content: PostContent = {};
        platforms.forEach(platform => {
            if (platformContent[platform]) {
                content[platform] = platformContent[platform];
            }
        });

        // Enhance image suggestion for Gemini API
        // Add technical specifications for better image generation quality
        let enhancedImageSuggestion = imageSuggestion;
        if (imageSuggestion) {
            // Ensure the prompt has style, composition, and quality keywords
            const hasQualityKeywords = /high.?resolution|4k|professional|cinematic|studio|detailed/i.test(imageSuggestion);
            if (!hasQualityKeywords) {
                enhancedImageSuggestion = `${imageSuggestion}. Style: high-resolution, professional, cinematic quality. Perfect for social media.`;
            }
            content.imageSuggestion = enhancedImageSuggestion;
        }

        // Enhance video suggestion for Gemini API (veo-3.1-fast-generate-preview)
        // Add technical specifications for better video generation
        let enhancedVideoSuggestion = videoSuggestion;
        if (videoSuggestion) {
            // Ensure the prompt has pacing, duration, and technical keywords
            const hasTechKeywords = /9:16|vertical|15.?sec|30.?sec|45.?sec|60.?sec|duration|pacing|cinematic/i.test(videoSuggestion);
            if (!hasTechKeywords) {
                enhancedVideoSuggestion = `${videoSuggestion}. Format: 9:16 vertical video, 30-45 seconds duration. Cinematic quality, professional editing, engaging pacing. Suitable for social media (TikTok, Instagram Reels, YouTube Shorts).`;
            }
            content.videoSuggestion = enhancedVideoSuggestion;
        }

        const newPost: Post = {
            id: crypto.randomUUID(),
            topic: topic || "AI Generated Content",
            platforms,
            postType: postType || 'post',
            content,
            status: 'draft',
            createdAt: new Date().toISOString(),
            isGeneratingImage: false,
            isGeneratingVideo: false,
            videoGenerationStatus: '',
        };

        onPostCreated(newPost);
        (async () => {
            await saveCurrentChat();
            await startNewChat();
        })();
    }, [onPostCreated, saveCurrentChat, startNewChat]);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0])
                        .map((result: any) => result.transcript)
                        .join('');
                    setUserInput(transcript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                    setIsRecording(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                    setIsRecording(false);
                };
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError(`File ${file.name} is too large. Maximum size is 10MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                const fileType = file.type.startsWith('image/') ? 'image' : 'file';
                
                setAttachedFiles(prev => [...prev, {
                    type: fileType,
                    name: file.name,
                    url: url,
                    size: file.size
                }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset inputs and close menu
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
        setShowUploadMenu(false);
    }, []);

    const removeAttachment = useCallback((index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const toggleVoiceInput = useCallback(() => {
        if (!recognitionRef.current) {
            setError('Voice input is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
            setIsRecording(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setIsRecording(true);
                setError(null);
            } catch (err) {
                console.error('Failed to start voice recognition:', err);
                setError('Failed to start voice input. Please try again.');
            }
        }
    }, [isListening]);

    // Close upload menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showUploadMenu && !target.closest('.upload-menu-container')) {
                setShowUploadMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUploadMenu]);

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || activeThreadId !== 'new' || isCreatingNewChat) return;

        const userMessage: Message = { 
            role: 'user', 
            content: userInput,
            attachments: attachedFiles.length > 0 ? attachedFiles : undefined
        };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setAttachedFiles([]); // Clear attachments after sending
        setIsLoading(true);
        setError(null);

        try {
            // Build conversation history for API
            const history = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
                    content: m.content
                }));

            // Call server-side API
            const result = await aiService.strategistChat(userInput, history);
            const data = result.data;
            const aiResponse = data.response;

            // Check if content was generated (user confirmed)
            if (data.readyToGenerate && data.generatedContent) {
                // Content was generated using generateSocialMediaContent
                const postData = {
                    topic: data.parameters.topic,
                    ...data.generatedContent
                };
                
                setMessages(prev => [...prev, {
                    role: 'system',
                    content: 'Perfect! Here is your generated content. Ready to create this post?',
                    postData: postData,
                }]);
            } else {
                // Regular conversation response with optional media
                const newMessage: Message = { 
                    role: 'model', 
                    content: aiResponse 
                };
                
                // Check if AI response includes generated media URLs
                if (data.generatedImage) {
                    newMessage.generatedImage = data.generatedImage;
                }
                if (data.generatedVideo) {
                    newMessage.generatedVideo = data.generatedVideo;
                }
                if (data.isGeneratingMedia) {
                    newMessage.isGeneratingMedia = true;
                }
                
                setMessages(prev => [...prev, newMessage]);
            }

        } catch (err: any) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            
            // Check for specific error types
            let userFriendlyMessage = 'Sorry, I ran into a problem. Please try again.';
            if (err.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
                userFriendlyMessage = '⚠️ Request timed out. The server might be starting up. Please try again in a moment.';
            } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
                userFriendlyMessage = '⚠️ API rate limit reached. Please wait a moment and try again.';
            } else if (errorMessage.includes('502') || errorMessage.includes('503') || err.code === 'ERR_NETWORK') {
                userFriendlyMessage = '⚠️ Service temporarily unavailable. Please try again in a few seconds.';
            }
            
            setError(errorMessage);
            setMessages(prev => [...prev, { role: 'system', content: userFriendlyMessage }]);
        } finally {
            setIsLoading(false);
        }
    }, [userInput, isLoading, messages, activeThreadId, attachedFiles, isCreatingNewChat]);
    
    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        // Fix: Replace `JSX.Element` with `React.ReactElement` to resolve namespace error.
        const elements: React.ReactElement[] = [];
        let listItems: React.ReactElement[] = [];

        const renderLineContent = (line: string) => {
            return line.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };
        
        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2">{listItems}</ul>);
                listItems = [];
            }
        };

        lines.forEach((line, i) => {
            if (line.trim().startsWith('* ')) {
                listItems.push(<li key={i} className="pl-2">{renderLineContent(line.trim().substring(2))}</li>);
            } else {
                flushList();
                if (line.trim() !== '') {
                    elements.push(<p key={i}>{renderLineContent(line)}</p>);
                }
            }
        });

        flushList();

        return <div className="space-y-2">{elements}</div>;
    };


    const MessageBubble: React.FC<{ msg: Message }> = React.memo(({ msg }) => {
        const isUser = msg.role === 'user';
        const isModel = msg.role === 'model';
        const isSystem = msg.role === 'system';

        if (isSystem && msg.postData) {
            return (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 my-3 shadow-md">
                    <p className="font-semibold text-gray-900 mb-4 text-base">{msg.content}</p>
                    <div className="bg-white p-6 rounded-lg mb-5 min-h-[500px]">
                        <h4 className="font-bold text-gray-900 mb-4 text-base">Topic: <span className="font-normal">{msg.postData.topic}</span></h4>
                        <textarea
                            readOnly
                            value={JSON.stringify(msg.postData, null, 2)}
                            className="w-full h-[420px] text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono bg-transparent resize-none focus:outline-none focus:ring-0 border-none p-0"
                        />
                    </div>
                    <button
                        onClick={() => handleCreatePost(msg.postData)}
                        className="w-full flex items-center justify-center py-4 px-4 shadow-lg shadow-indigo-500/30 text-base font-bold rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Accept & Create Post
                    </button>
                </div>
            );
        }

        return (
            <div className={`flex items-start gap-3 py-4 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-gray-800' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                    {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`space-y-2 overflow-hidden ${isUser ? 'max-w-[70%]' : 'flex-1'}`}>
                    {/* User Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {msg.attachments.map((file, idx) => (
                                <div key={idx} className="relative group">
                                    {file.type === 'image' ? (
                                        <img src={file.url} alt={file.name} className="max-w-xs rounded-lg border border-gray-200 shadow-sm" />
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
                                            <FileText className="w-4 h-4 text-gray-600" />
                                            <span className="text-sm text-gray-700">{file.name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* AI-Generated Image */}
                    {msg.generatedImage && (
                        <div className="my-3">
                            <div className="relative group max-w-lg">
                                <img 
                                    src={msg.generatedImage} 
                                    alt="AI Generated" 
                                    className="w-full rounded-xl border border-gray-200 shadow-lg"
                                />
                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm">
                                    AI Generated
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* AI-Generated Video */}
                    {msg.generatedVideo && (
                        <div className="my-3">
                            <div className="relative group max-w-lg">
                                <video 
                                    src={msg.generatedVideo} 
                                    controls 
                                    className="w-full rounded-xl border border-gray-200 shadow-lg"
                                    playsInline
                                >
                                    Your browser does not support the video tag.
                                </video>
                                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm">
                                    AI Generated Video
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Media Generation Loading State */}
                    {msg.isGeneratingMedia && (
                        <div className="my-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                <div>
                                    <p className="text-sm font-medium text-emerald-900">Generating media...</p>
                                    <p className="text-xs text-emerald-700">This may take a few moments</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={`text-[15px] leading-7 ${isUser ? 'bg-gray-100 text-gray-900 p-3.5 rounded-2xl rounded-tr-md border border-gray-200' : 'text-gray-800'}`}>
                        {isModel ? renderMarkdown(msg.content) : <p className="whitespace-pre-wrap">{msg.content}</p>}
                    </div>
                </div>
            </div>
        );
    });

    return (
        <div ref={containerRef} className="h-full flex flex-row">
            {isHistoryVisible && (
                <div className="w-64 bg-gray-900 flex flex-col h-full">
                    <div className="p-3">
                        <button
                            onClick={() => startNewChat()}
                            disabled={isCreatingNewChat}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreatingNewChat ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <PlusCircle className="w-4 h-4" />
                            )}
                            {isCreatingNewChat ? 'Creating...' : 'New chat'}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2">
                        <div className="text-xs font-semibold text-gray-400 px-3 py-2 uppercase tracking-wider">Recent</div>
                        <nav className="space-y-1">
                            {chatHistory.map(thread => (
                                <div
                                    key={thread.id}
                                    className={`relative flex items-center gap-2 p-2.5 rounded-lg transition-all group ${
                                        activeThreadId === thread.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                                    }`}
                                >
                                    <button
                                        onClick={() => handleSelectThread(thread)}
                                        className="flex-1 text-left min-w-0"
                                    >
                                        <p className="text-sm text-gray-200 truncate">{thread.title}</p>
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteThread(e, thread.id)}
                                        className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                        title="Delete chat"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col h-full bg-white">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                    <button
                        onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={isHistoryVisible ? "Hide sidebar" : "Show sidebar"}
                    >
                        {isHistoryVisible ? <PanelLeftClose className="w-5 h-5 text-gray-600" /> : <History className="w-5 h-5 text-gray-600" />}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">AI Content Strategist</span>
                    </div>
                    <div className="w-9" />
                </div>

                {/* Messages Container */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto">
                        {messages.map((msg, index) => <MessageBubble key={index} msg={msg} />)}
                        {isLoading && (
                            <div className="flex items-start gap-3 py-4 px-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                                        <span className="text-sm text-gray-600">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 bg-white">
                    <div className="max-w-5xl mx-auto px-4 py-4">
                        {error && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}
                        {/* Attached Files Preview */}
                        {attachedFiles.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {attachedFiles.map((file, idx) => (
                                    <div key={idx} className="relative group">
                                        {file.type === 'image' ? (
                                            <div className="relative">
                                                <img src={file.url} alt={file.name} className="h-20 w-20 object-cover rounded-lg border border-gray-300" />
                                                <button
                                                    onClick={() => removeAttachment(idx)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-300">
                                                <FileText className="w-4 h-4 text-gray-600" />
                                                <span className="text-sm text-gray-700 max-w-[150px] truncate">{file.name}</span>
                                                <button
                                                    onClick={() => removeAttachment(idx)}
                                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    <X className="w-3 h-3 text-gray-600" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <form onSubmit={handleSubmit} className="relative">
                            <div className="flex items-center gap-2 bg-gray-100 rounded-3xl px-2 py-2 shadow-sm border border-gray-200">
                                {/* Hidden File Inputs */}
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'image')}
                                    className="hidden"
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                                    onChange={(e) => handleFileUpload(e, 'file')}
                                    className="hidden"
                                />
                                
                                {/* Plus Button with Dropdown */}
                                <div className="relative upload-menu-container">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadMenu(!showUploadMenu)}
                                        disabled={isLoading || activeThreadId !== 'new' || isCreatingNewChat}
                                        className="p-2 rounded-full text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title="Attach files"
                                    >
                                        <PlusCircle className="w-5 h-5" />
                                    </button>
                                    
                                    {/* Upload Menu Dropdown - ChatGPT Style */}
                                    {showUploadMenu && (
                                        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 min-w-[220px] z-10">
                                            <button
                                                type="button"
                                                onClick={() => imageInputRef.current?.click()}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                                    <Paperclip className="w-4 h-4 text-gray-700" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">Add photos & files</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => imageInputRef.current?.click()}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                                    <Sparkles className="w-4 h-4 text-gray-700" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">Create image</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                                    <Lightbulb className="w-4 h-4 text-gray-700" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">Thinking</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                                    <BookOpen className="w-4 h-4 text-gray-700" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">Study and learn</span>
                                            </button>
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <button
                                                type="button"
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                            >
                                                <span className="text-sm font-medium text-gray-900">More</span>
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Text Input */}
                                <input
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={activeThreadId !== 'new' ? "Viewing history (read-only)" : isCreatingNewChat ? "Creating new chat..." : isRecording ? "Listening..." : "Message AI Strategist..."}
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 text-[15px] placeholder:text-gray-500 disabled:text-gray-400"
                                    disabled={isLoading || activeThreadId !== 'new' || isCreatingNewChat}
                                />
                                
                                {/* Voice Input Button */}
                                <button
                                    type="button"
                                    onClick={toggleVoiceInput}
                                    disabled={isLoading || activeThreadId !== 'new' || isCreatingNewChat}
                                    className={`p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                        isRecording 
                                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                            : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                                    title={isRecording ? "Stop recording" : "Voice input"}
                                >
                                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                
                                {/* Send Button - Only show when there's text */}
                                {userInput.trim() && (
                                    <button
                                        type="submit"
                                        disabled={isLoading || activeThreadId !== 'new' || isCreatingNewChat}
                                        className="p-2 rounded-full text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </form>
                        <p className="text-xs text-gray-500 text-center mt-2">AI can make mistakes. Consider checking important information.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Wrap with React.memo to prevent unnecessary re-renders when parent re-renders
export default React.memo(ContentStrategistView);

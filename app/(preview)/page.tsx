"use client";

import { Input } from "@/components/ui/input";
import { Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown, { Options } from "react-markdown";
import React from "react";
import ProjectOverview from "@/components/project-overview";
import { LoadingIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

// ChatBubble component
interface ChatBubbleProps {
  message: React.ReactNode
  direction: "from" | "to"
  timestamp: Date
  avatar?: string
  className?: string
}

function ChatBubble({ message, direction, timestamp, avatar, className }: ChatBubbleProps) {
  const isFromMessage = direction === "from"

  return (
    <div className={cn("flex", isFromMessage ? "justify-start" : "justify-end", className)}>
      <div className={cn("max-w-[80%]", isFromMessage ? "items-start" : "items-end")}>
        <div
          className={cn(
            "px-4 py-2 rounded-2xl",
            isFromMessage
              ? "bg-[#495C4B] text-white rounded-tl-none"
              : "bg-[#7AA587] text-white rounded-tr-none",
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {message}
          </div>
        </div>
        <span className="text-xs text-[#495C4B] mt-1 block">{format(timestamp, "h:mm a")}</span>
      </div>
    </div>
  )
}

export default function Chat() {
  // Add a ref for the chat container
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [toolCall, setToolCall] = useState<string>();
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } =
    useChat({
      maxSteps: 4,
      onToolCall({ toolCall }) {
        setToolCall(toolCall.toolName);
      },
      onError: (error) => {
        toast.error("You've been rate limited, please try again later!");
      },
    });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const initialMessageSent = useRef(false);

  // Track whether we've received the AI's introduction
  const [introReceived, setIntroReceived] = useState(false);
  
  // Filter messages to hide the initial prompt
  const displayMessages = useMemo(() => {
    if (messages.length <= 1) return [];
    
    // If we have at least the intro message and response, mark intro as received
    if (messages.length >= 2 && !introReceived) {
      setIntroReceived(true);
    }
    
    // Skip the first message (our hidden prompt)
    return messages.slice(1);
  }, [messages, introReceived]);

  // Send initial message when component mounts
  useEffect(() => {
    if (!initialMessageSent.current && messages.length === 0) {
      const introMessage = "Hello, please introduce yourself as just Sage in 1 to 2 sentences and offer to help with any questions the user might have.";
      
      // Set the input value
      setInput(introMessage);
      
      // Use setTimeout to allow the input to be set before submitting
      setTimeout(() => {
        // Create a synthetic form submission event
        const syntheticEvent = {
          preventDefault: () => {},
        } as React.FormEvent<HTMLFormElement>;
        
        // Call handleSubmit with the synthetic event
        handleSubmit(syntheticEvent);
        
        // Mark as sent
        initialMessageSent.current = true;
      }, 100);
    }
  }, [messages, setInput, handleSubmit]);

  useEffect(() => {
    if (messages.length > 0) setIsExpanded(true);
  }, [messages]);

  const currentToolCall = useMemo(() => {
    const tools = messages?.slice(-1)[0]?.toolInvocations;
    if (tools && toolCall === tools[0].toolName) {
      return tools[0].toolName;
    } else {
      return undefined;
    }
  }, [toolCall, messages]);

  const awaitingResponse = useMemo(() => {
    if (
      isLoading &&
      currentToolCall === undefined &&
      messages.slice(-1)[0]?.role === "user"
    ) {
      return true;
    } else {
      return false;
    }
  }, [isLoading, currentToolCall, messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current && displayMessages.length > 0) {
      const scrollContainer = chatContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [displayMessages, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#495C4B] mb-2">Chat With Sage</h1>
            <p className="text-[#7AA587]">Ask me anything and get helpful responses</p>
          </div>
          
          {/* Main content area */}
          <div className="grid gap-6 md:grid-cols-[1fr_3fr]">
            {/* Sidebar */}
            <div className="hidden md:block">
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-[#7AA587]">
                <h3 className="font-medium text-[#495C4B] mb-3">Tips</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-[#7AA587] font-bold">•</span>
                    <span>Ask about Cambridge, Somerville, or Medford real estate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#7AA587] font-bold">•</span>
                    <span>Get advice on buying, selling, or renting properties</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#7AA587] font-bold">•</span>
                    <span>Learn about neighborhood trends and market conditions</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Chat container */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
              {/* Chat header */}
              <div className="bg-[#495C4B] text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#7AA587]"></div>
                  <span className="font-medium">Chat Session</span>
                </div>
                <span className="text-xs opacity-75">{format(new Date(), "MMMM d, yyyy")}</span>
              </div>
              
              {/* Chat messages */}
              <div 
                ref={chatContainerRef}
                className="h-[500px] overflow-y-auto p-4 flex flex-col"
              >
                {!introReceived ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-6 bg-[#f8f9fa] rounded-lg max-w-md">
                      <div className="w-16 h-16 bg-[#7AA587] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-[#495C4B] mb-2">Welcome to the Chat</h3>
                      <p className="text-gray-600 mb-4">Loading your assistant...</p>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {displayMessages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-4"
                      >
                        {message.role === "user" ? (
                          <ChatBubble
                            message={message.content}
                            direction="to"
                            timestamp={new Date(message.createdAt || Date.now())}
                          />
                        ) : (
                          <AssistantMessage message={message} />
                        )}
                      </motion.div>
                    ))}
                    
                    {awaitingResponse && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mb-4"
                      >
                        <Loading tool={currentToolCall} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
              
              {/* Input area */}
              <div className="p-3 border-t border-gray-200 bg-[#f8f9fa]">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    className="bg-white text-base flex-1 text-black border-[#7AA587] focus-visible:ring-[#7AA587] rounded-full px-4"
                    minLength={3}
                    required
                    value={input}
                    placeholder="Type your message..."
                    onChange={handleInputChange}
                  />
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-[#7AA587] text-white rounded-full hover:bg-[#495C4B] transition-colors flex items-center justify-center"
                    disabled={isLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center text-sm text-[#495C4B] opacity-75">
            Sage AI • {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}

const AssistantMessage = ({ message }: { message: Message | undefined }) => {
  if (message === undefined) return null;

  return (
    <ChatBubble
      message={
        <MemoizedReactMarkdown>
          {message.content}
        </MemoizedReactMarkdown>
      }
      direction="from"
      timestamp={new Date(message.createdAt || Date.now())}
    />
  );
};

const TypingAnimation = () => {
  return (
    <div className="flex justify-start">
      <div className="bg-[#495C4B] text-white px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%]">
        <div className="flex space-x-1 items-center">
          <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    </div>
  );
};

const Loading = ({ tool }: { tool?: string }) => {
  const toolName =
    tool === "getInformation"
      ? "Getting information"
      : tool === "addResource"
        ? "Adding information"
        : tool === "understandQuery"
          ? "Analyzing your question"
          : null;

  return toolName ? (
    <div className="flex justify-start">
      <div className="bg-[#495C4B] text-white px-4 py-2 rounded-2xl rounded-tl-none max-w-[80%]">
        <div className="flex flex-row gap-2 items-center">
          <div className="animate-spin text-white">
            <LoadingIcon />
          </div>
          <div className="text-white text-sm">
            {toolName}...
          </div>
        </div>
      </div>
    </div>
  ) : (
    <TypingAnimation />
  );
};

const MemoizedReactMarkdown: React.FC<Options> = React.memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className,
);

/**
 * CMA Prompt Input Component
 * Natural language input for clinical metrics analysis
 */

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Mic, MicOff, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CMAPromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "Show hip ROM progression over the rehab process",
  "Graph pain score vs workload over time",
  "Compare quad strength and reported pain over the last 8 weeks",
  "Show strength progression across all documented sessions",
  "Build a trend line of knee flexion improvement",
];

export function CMAPromptInput({
  onSubmit,
  isLoading = false,
  placeholder = "Ask CMA about this patient's metrics...",
  suggestions = DEFAULT_SUGGESTIONS,
}: CMAPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
      setPrompt("");
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const toggleRecording = () => {
    // Voice input placeholder - would integrate with Web Speech API
    setIsRecording(!isRecording);
  };

  return (
    <div className="w-full">
      {/* Main Input Area */}
      <div className="relative">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className={cn(
                "w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400",
                "focus:outline-none focus:ring-0",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              style={{ minHeight: "24px", maxHeight: "120px" }}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleRecording}
              disabled={isLoading}
              className={cn(
                "h-8 w-8 p-0",
                isRecording && "text-red-500 bg-red-50"
              )}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              size="sm"
              className="h-8 px-3"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && !isLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl border border-slate-200 bg-white shadow-lg z-10">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <History className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Suggestions</span>
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      <p className="mt-2 text-xs text-slate-400 text-center">
        Ask questions about clinical metrics, trends, and comparisons. CMA will interpret your request and generate visualizations.
      </p>
    </div>
  );
}

export default CMAPromptInput;

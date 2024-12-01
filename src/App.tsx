import React, { useState, useCallback, useRef, useEffect } from "react";
import logo from "./assets/ankibyte-logo.png";
import "./fonts.css";
import { RelevanceDistribution, EmbeddingVisualization } from './components/visualizations';

interface ProcessingResponse {
  status: string;
  message: string;
  task_id: string;
  download_url: string;
  output_file?: string;
  statistics: {
    total_cards: number;
    high_relevance: number;
    medium_relevance: number;
    low_relevance: number;
    deck_info: {
      total_notes: number;
      total_cards: number;
      deck_name: string;
      media_files: number;
      processing_results?: {
        high_relevance: number;
        medium_relevance: number;
        low_relevance: number;
        average_similarity: number;
      };
    };
  };
  visualizations: {
    relevance_distribution: {
      data: any[];
      config: any;
    } | null;
    embedding_visualization: {
      data: any[];
      config: any;
    } | null;
  };
  processing_metrics: {
    embedding_model: string;
    processing_time: string | number;
    pdf_pages: number;
    chunks_processed: number;
  };
}

type CardColor = 'blue' | 'green' | 'yellow' | 'red';

interface StatCardProps {
  title: string;
  value: number;
  color: CardColor;
}

interface MetricItemProps {
  label: string;
  value: string | number;
}

const App: React.FC = () => {
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const [ankiFile, setAnkiFile] = useState<File | null>(null);
  const [studyMaterial, setStudyMaterial] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [selectedModel, setSelectedModel] = useState("text-embedding-3-small");
  const [processingResults, setProcessingResults] = useState<ProcessingResponse | null>(null);
  const [showResults, setShowResults] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/health/`);
        const data = await response.json();
        console.log("Backend health check:", data);
      } catch (err) {
        console.error("Backend connection error:", err);
      }
    };

    testBackendConnection();
  }, [apiUrl]);

  const formatTime = (time: string | number): string => {
    const timeNumber = typeof time === 'string' ? parseFloat(time) : time;
    return isNaN(timeNumber) ? '0.00s' : `${timeNumber.toFixed(2)}s`;
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes} min ${remainingSeconds} sec`;
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      console.log(`[Polling] Requesting status for job ${jobId}`);
      const response = await fetch(`${apiUrl}/api/upload-progress/${jobId}/`);
      const data = await response.json();
      
      console.log("[Polling] Received data:", data);
  
      if (data.progress_data) {
        // Extract values from progress_data
        const currentProgress = parseFloat(data.progress_data.progress || 0);
        const currentPhase = data.progress_data.phase;
        const timeRemaining = parseFloat(data.progress_data.estimated_time_remaining || 0);
  
        console.log("[Polling] Setting progress to:", currentProgress);
        setProgress(currentProgress);
  
        if (currentPhase) {
          console.log("[Polling] Setting phase to:", currentPhase);
          setCurrentPhase(currentPhase);
        }
  
        if (timeRemaining >= 0) {
          console.log("[Polling] Setting time estimate to:", timeRemaining);
          setEstimatedTime(timeRemaining);
        }
      }
  
      // Check both status and progress for completion
      if (data.status === "COMPLETED" || 
          (data.progress_data && data.progress_data.progress === 100)) {
        console.log("[Polling] Process completed");
        setSuccess("Processing completed successfully!");
        setProcessing(false);
        setShowResults(true);
  
        // If we have result data in the initial response, set it
        if (data.statistics) {
          setProcessingResults(data);
        }
        return true;
      } else if (data.status === "FAILED") {
        console.log("[Polling] Process failed");
        setError(data.error_message || "Processing failed");
        setProcessing(false);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("[Polling] Error:", err);
      return false;
    }
  };

  const resetState = useCallback(() => {
    setAnkiFile(null);
    setStudyMaterial(null);
    setProgress(0);
    setError(null);
    setSuccess(null);
    setEstimatedTime(null);
    setJobId(null);
    setCurrentPhase(null);
    setCustomTag("");
  }, []);

  const handleButtonClick = () => {
    if (showResults && processingResults?.download_url) {
      const link = document.createElement('a');
      link.href = processingResults.download_url;
      link.download = 'tagged_deck.apkg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      handleSubmit();
    }
  };

  const getButtonText = () => {
    if (processing) return "Processing...";
    if (showResults && processingResults?.download_url) return "Download Tagged Deck";
    return "Process Deck";
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileType: "anki" | "study") => {
    const file = event.target.files?.[0];
    setError(null);
    setSuccess(null);
  
    if (!file) return;
  
    if (fileType === "anki") {
      if (!file.name.endsWith(".apkg")) {
        setError("Please upload a valid Anki deck file (.apkg)");
        return;
      }
      setAnkiFile(file);
    } else {
      if (!file.name.endsWith(".pdf")) {
        setError("Please upload a PDF study material");
        return;
      }
      setStudyMaterial(file);
    }
  };

  const handleTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedTag = event.target.value.replace(/[^a-zA-Z0-9]/g, "_");
    setCustomTag(sanitizedTag);
  };

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(event.target.value);
  };

  const handleSubmit = async () => {
    if (!ankiFile || !studyMaterial) {
      setError("Please upload both an Anki deck and study material");
      return;
    }
  
    if (!customTag) {
      setError("Please enter a tag prefix for your cards");
      return;
    }
  
    setProcessing(true);
    setProgress(0);
    setError(null);
    setSuccess(null);
    setCurrentPhase("Initializing");
    setShowResults(false);
    setProcessingResults(null);
    setEstimatedTime(null);
  
    const formData = new FormData();
    formData.append("anki_file", ankiFile);
    formData.append("study_material", studyMaterial);
    formData.append("custom_tag", customTag);
    formData.append("model", selectedModel);
  
    try {
      const response = await fetch(`${apiUrl}/api/process-deck/`, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'include',
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("[Submit] Initial response:", data);
  
      if (data.task_id) {
        setJobId(data.task_id);
        
        // Start polling immediately
        const pollInterval = setInterval(async () => {
          console.log("[Polling] Checking status...");
          try {
            const completed = await pollJobStatus(data.task_id);
            if (completed) {
              console.log("[Polling] Process completed, clearing interval");
              clearInterval(pollInterval);
              setProcessingResults(data);
            }
          } catch (pollError) {
            console.error("[Polling] Error:", pollError);
            clearInterval(pollInterval);
            setError("Error checking progress");
            setProcessing(false);
          }
        }, 1000); // Poll every second
  
        // Cleanup function
        return () => {
          console.log("[Polling] Cleaning up interval");
          clearInterval(pollInterval);
        };
      }
    } catch (err) {
      console.error("[Submit] Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setProcessing(false);
    }
  };

  const renderProgress = () => (
    <div className="text-center space-y-6 py-8">
      <div className="animate-spin text-blue-500 mx-auto w-12 h-12 border-4 border-current border-t-transparent rounded-full"></div>
      <div className="space-y-2">
        <p className="text-lg font-medium text-gray-700">
          Processing Your Deck
        </p>
        <p className="text-gray-500 max-w-md mx-auto">
          This may take a few minutes for large decks. We're analyzing your cards 
          and comparing them with your study materials to ensure accurate tagging.
        </p>
      </div>
    </div>
  );

  const embeddingModels = [
    {
      value: "text-embedding-3-small",
      label: "Text Embedding 3 Small",
      description: "Fastest, most compact model",
    },
    {
      value: "text-embedding-3-large",
      label: "Text Embedding 3 Large",
      description: "Most capable model, best for complex tasks",
    },
    {
      value: "text-embedding-ada-002",
      label: "Text Embedding Ada 002",
      description: "Legacy model, balanced performance",
    },
  ];

  const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => {
    const colorClasses: Record<CardColor, string> = {
      blue: "bg-blue-50 border-blue-200 text-blue-700",
      green: "bg-green-50 border-green-200 text-green-700",
      yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
      red: "bg-red-50 border-red-200 text-red-700"
    };

    return (
      <div className={`${colorClasses[color]} rounded-lg p-4 border`}>
        <h4 className="text-sm font-medium opacity-75">{title}</h4>
        <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
      </div>
    );
  };

  const MetricItem: React.FC<MetricItemProps> = ({ label, value }) => (
    <div className="flex flex-col">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  const renderFileInput = (type: "anki" | "study", file: File | null, label: string) => (
    <div className="relative">
      <label className="block mb-2 font-medium text-gray-700">{label}</label>
      <input
        type="file"
        accept={type === "anki" ? ".apkg" : ".pdf"}
        onChange={(e) => handleFileUpload(e, type)}
        className="w-full p-2 rounded-lg border border-gray-200 
                 file:mr-4 file:py-2 file:px-4 file:rounded-lg 
                 file:border-0 file:text-sm file:font-semibold 
                 file:bg-blue-500 file:text-white 
                 hover:file:bg-blue-600 cursor-pointer
                 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                 transition-all duration-200"
      />
      {file && (
        <p className="mt-2 text-sm text-gray-500">Selected: {file.name}</p>
      )}
    </div>
  );

  const renderModelSelect = () => (
    <div className="relative">
      <label className="block mb-2 font-medium text-gray-700">
        Embedding Model
      </label>
      <select
        value={selectedModel}
        onChange={handleModelChange}
        className="w-full p-2 rounded-lg border border-gray-200
                  bg-white cursor-pointer
                  focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                  transition-all duration-200"
      >
        {embeddingModels.map((model) => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-sm text-gray-500">
        {embeddingModels.find((model) => model.value === selectedModel)?.description}
      </p>
    </div>
  );

  const renderTagInput = () => (
    <div className="relative">
      <label className="block mb-2 font-medium text-gray-700">
        Tag Prefix
        <span className="ml-1 text-sm text-gray-500">
          (Will create tags like: prefix_high, prefix_medium, prefix_low)
        </span>
      </label>
      <input
        type="text"
        value={customTag}
        onChange={handleTagChange}
        placeholder="Enter tag prefix"
        className="w-full p-2 rounded-lg border border-gray-200
                  focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                  transition-all duration-200"
      />
      {customTag && (
        <div className="mt-2 text-sm text-gray-500">
          Will create tags:
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-md">
            {customTag}_high
          </span>
          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md">
            {customTag}_medium
          </span>
          <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-md">
            {customTag}_low
          </span>
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    if (!showResults || !processingResults?.statistics) return null;

    return (
      <div className="mt-8 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cards"
            value={processingResults.statistics.total_cards || 0}
            color="blue"
          />
          <StatCard
            title="High Relevance"
            value={processingResults.statistics.high_relevance || 0}
            color="green"
          />
          <StatCard
            title="Medium Relevance"
            value={processingResults.statistics.medium_relevance || 0}
            color="yellow"
          />
          <StatCard
            title="Low Relevance"
            value={processingResults.statistics.low_relevance || 0}
            color="red"
          />
        </div>

        {/* Processing Metrics */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Processing Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <MetricItem
              label="Embedding Model"
              value={processingResults.processing_metrics.embedding_model}
            />
            <MetricItem
              label="Processing Time"
              value={formatTime(processingResults.processing_metrics.processing_time)}
            />
          </div>
        </div>

        {/* Visualizations Container */}
        <div className="space-y-6">
          {processingResults.visualizations?.relevance_distribution && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4 text-center">Relevance Distribution</h3>
              <div className="h-[400px] w-full">
                <RelevanceDistribution
                  data={processingResults.visualizations.relevance_distribution.data}
                />
              </div>
            </div>
          )}

          {processingResults.visualizations?.embedding_visualization && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4 text-center">Embedding Visualization</h3>
              <div className="h-[500px] w-full">
                <EmbeddingVisualization
                  data={processingResults.visualizations.embedding_visualization.data}
                  config={{
                    ...processingResults.visualizations.embedding_visualization.config,
                    margin: { top: 40, right: 40, bottom: 60, left: 60 },
                    xAxis: {
                      label: {
                        offset: 40,
                        style: { fontSize: 12 }
                      }
                    },
                    yAxis: {
                      label: {
                        offset: 40,
                        style: { fontSize: 12 }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setShowResults(false);
              setProcessingResults(null);
              resetState();
            }}
            className="px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 
                     transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Process Another Deck
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Logo */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <img
            src={logo}
            alt="Ankibyte Logo"
            className="h-16 md:h-20 object-contain animate-bounce-light"
          />
          <h1 className="logo-text font-display text-4xl md:text-5xl tracking-wider logo-gradient hover:scale-105 transform transition-transform duration-300">
            ANKIBYTE
          </h1>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Description */}
            <p className="text-lg text-center text-gray-600">
              Upload your Anki deck and study materials to tag cards by relevance
            </p>

            {/* Input Form */}
            <div className={showResults ? "opacity-50 pointer-events-none" : ""}>
              {renderTagInput()}
              {renderModelSelect()}
              <div className="space-y-4">
                {renderFileInput("anki", ankiFile, "Anki Deck (.apkg)")}
                {renderFileInput("study", studyMaterial, "Study Material (PDF)")}
              </div>
            </div>

            {/* Process/Download Button */}
            <button
              ref={downloadButtonRef}
              onClick={handleButtonClick}
              disabled={processing}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                ${processing
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : showResults && processingResults?.download_url
                    ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                    : (!ankiFile || !studyMaterial || !customTag)
                      ? "bg-blue-300 text-white cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                } hover:shadow-lg active:transform active:scale-[0.99]`}
            >
              {getButtonText()}
            </button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 animate-fade-in">
                {error}
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 rounded-lg p-4 animate-fade-in">
                {success}
              </div>
            )}

            {/* Progress Section */}
            {processing && renderProgress()}
          </div>
        </div>

        {/* Results Section */}
        {renderResults()}
      </div>

      <style>
        {`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }

          @keyframes bounce-light {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          .animate-bounce-light {
            animation: bounce-light 2s ease-in-out infinite;
          }

          .logo-gradient {
            background: linear-gradient(45deg, #2196F3, #1976D2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
        `}
      </style>
    </div>
  );
};

export default App;
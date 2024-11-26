import React, { useState, useCallback } from "react";
import logo from "./assets/ankibyte-logo.png";
import "./fonts.css";

function App() {
  const [ankiFile, setAnkiFile] = useState(null);
  const [studyMaterial, setStudyMaterial] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [customTag, setCustomTag] = useState("");
  const [selectedModel, setSelectedModel] = useState("text-embedding-3-small");

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // Available embedding models
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

  const handleFileUpload = (event, fileType) => {
    const file = event.target.files[0];
    setError(null);
    setSuccess(null);

    if (!file) return;

    if (fileType === "anki") {
      if (!file.name.endsWith(".apkg")) {
        setError("Please upload a valid Anki deck file (.apkg)");
        return;
      }
      setAnkiFile(file);
      const estimatedSeconds = Math.ceil((file.size / (1024 * 1024)) * 30);
      setEstimatedTime(estimatedSeconds);
    } else {
      if (!file.name.endsWith(".pdf")) {
        setError("Please upload a PDF study material");
        return;
      }
      setStudyMaterial(file);
    }
  };

  const handleTagChange = (event) => {
    // Remove spaces and special characters, replace with underscores
    const sanitizedTag = event.target.value.replace(/[^a-zA-Z0-9]/g, "_");
    setCustomTag(sanitizedTag);
  };

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  const pollJobStatus = async (jobId) => {
    try {
      const response = await fetch(`${apiUrl}/api/jobs/${jobId}/status/`);
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }

      const data = await response.json();
      setProgress(data.progress || 0);
      setCurrentPhase(data.current_phase || null);

      if (data.status === "COMPLETED") {
        setSuccess("Processing completed successfully!");
        setProcessing(false);
        if (data.download_url) {
          window.location.href = data.download_url;
        }
        setTimeout(resetState, 3000);
        return true;
      } else if (data.status === "FAILED") {
        throw new Error(data.error_message || "Processing failed");
      }
      return false;
    } catch (err) {
      console.error("Error polling job status:", err);
      setError(err.message || "Error checking job status");
      setProcessing(false);
      return true;
    }
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
    setCurrentPhase(null);
  
    const formData = new FormData();
    formData.append("anki_file", ankiFile);
    formData.append("study_material", studyMaterial);
    formData.append("custom_tag", customTag);
    formData.append("model", selectedModel);
  
    const requestUrl = `${apiUrl}/api/process-deck/`;
    console.log('Making request to:', requestUrl);
    console.log('API URL from env:', process.env.REACT_APP_API_URL);
  
    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'include',
      });
  
      console.log('Response:', response);
  
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        try {
          const parsedError = JSON.parse(errorData);
          throw new Error(parsedError.error || parsedError.detail || "Processing failed");
        } catch (e) {
          throw new Error(`Server error: ${errorData}`);
        }
      }
  
      const data = await response.json();
      console.log('Success response:', data);
      
      setJobId(data.task_id);
      setEstimatedTime(data.estimated_time);
  
      // Start polling if there's a task ID
      if (data.task_id) {
        const pollInterval = setInterval(async () => {
          try {
            const completed = await pollJobStatus(data.task_id);
            if (completed) {
              clearInterval(pollInterval);
            }
          } catch (pollError) {
            clearInterval(pollInterval);
            setError(pollError.message || "Error checking job status");
            setProcessing(false);
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Submit error details:', err);
      setError(err.message || "An error occurred while processing your files");
      setProcessing(false);
    }
  };

  const renderFileInput = (type, file, label) => (
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
      {/* Show description of selected model */}
      <p className="mt-2 text-sm text-gray-500">
        {
          embeddingModels.find((model) => model.value === selectedModel)
            ?.description
        }
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

  const renderProgress = () => (
    <div className="space-y-4">
      <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300 ease-in-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse"></div>
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-gray-600">
          {currentPhase && (
            <span className="font-medium text-blue-600">{currentPhase}</span>
          )}
        </p>
        <p className="text-gray-600">
          Progress: {progress}% complete
          {estimatedTime && progress < 100 && (
            <span>
              {" "}
              (Estimated time remaining:{" "}
              {Math.ceil((estimatedTime * (100 - progress)) / 100)} seconds)
            </span>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
          <div className="space-y-6">
            {/* Description */}
            <p className="text-lg text-center text-gray-600">
              Upload your Anki deck and study materials to tag cards by
              relevance
            </p>

            {/* Tag Input */}
            {renderTagInput()}

            {/* Model Selection */}
            {renderModelSelect()}

            {/* File Upload Section */}
            <div className="space-y-4">
              {renderFileInput("anki", ankiFile, "Anki Deck (.apkg)")}
              {renderFileInput("study", studyMaterial, "Study Material (PDF)")}
            </div>

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

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={processing || !ankiFile || !studyMaterial || !customTag}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                ${
                  processing || !ankiFile || !studyMaterial || !customTag
                    ? "bg-blue-300 text-white cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg active:transform active:scale-[0.99]"
                }`}
            >
              {processing ? "Processing..." : "Process Deck"}
            </button>
          </div>
        </div>
      </div>

      {/* Add keyframes for animations */}
      <style jsx="true">{`
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

        @keyframes pulse {
          0% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

export default App;

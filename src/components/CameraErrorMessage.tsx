import React from 'react';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { CameraErrorState, isInsideIframe } from '../hooks/useWebcam';

interface CameraErrorMessageProps {
  error: CameraErrorState;
  onRetry: () => void;
}

export const CameraErrorMessage: React.FC<CameraErrorMessageProps> = ({ error, onRetry }) => {
  const inIframe = isInsideIframe();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '#';

  return (
    <div className="p-3.5 rounded-md border border-red-200 bg-red-50 text-gray-800 text-left space-y-2.5">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          {/* Main User-Friendly Guidance */}
          <p className="text-sm font-semibold text-red-900">{error.userMessage}</p>
          
          {/* Exact Error Name and Message */}
          <p className="text-xs text-red-700 font-mono bg-red-100/70 px-2 py-1 rounded">
            Error: {error.name} - {error.message}
          </p>

          {/* Iframe Note */}
          {inIframe && (
            <p className="text-xs text-red-800 pt-1">
              The camera may be blocked in this preview. Click Open in new tab for the full version.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons: Try Again & Open in new tab */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-200/60">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>

        {inIframe && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-md text-xs font-medium transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            Open in new tab
          </a>
        )}
      </div>
    </div>
  );
};

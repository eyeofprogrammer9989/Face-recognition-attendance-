import React from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface ModelLoadingOverlayProps {
  isLoading: boolean;
  message: string;
  error: string | null;
  onRetry: () => void;
}

export const ModelLoadingOverlay: React.FC<ModelLoadingOverlayProps> = ({
  isLoading,
  message,
  error,
  onRetry,
}) => {
  if (!isLoading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 shadow-md text-center">
        {error ? (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Failed to Load Face Models</h3>
              <p className="text-sm text-gray-600 mt-1">
                {error}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                An active internet connection is needed to load models from the public CDN.
              </p>
            </div>
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition cursor-pointer w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Loading Models
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-gray-900">Loading Face Models...</h3>
              <p className="text-xs text-gray-500 mt-1">
                {message || 'Connecting to face recognition models...'}
              </p>
            </div>
            <div className="text-xs text-gray-400 bg-gray-50 p-2.5 rounded-md border border-gray-200">
              Loading detection and recognition models from public CDN. This only takes a few seconds.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

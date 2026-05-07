/**
 * WFS-specific error detection and user-friendly messaging.
 * Handles CORS, timeouts, malformed responses, and large result sets.
 */

export interface WFSError {
  code: string;
  message: string;
  userMessage: string;
  isRecoverable: boolean;
  suggestion?: string;
}

export enum WFSErrorCode {
  CORS_BLOCKED = "CORS_BLOCKED",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  MALFORMED_GEOJSON = "MALFORMED_GEOJSON",
  LARGE_RESULT_SET = "LARGE_RESULT_SET",
  RATE_LIMITED = "RATE_LIMITED",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
}

/**
 * Detect error type from fetch error or HTTP response.
 */
export function detectWFSError(error: unknown, response?: Response): WFSError {
  // Handle AbortError (timeout)
  if (error instanceof Error && error.name === "AbortError") {
    return {
      code: WFSErrorCode.TIMEOUT,
      message: "WFS request timed out after 15 seconds",
      userMessage: "The server took too long to respond. Try a smaller area or fewer features.",
      isRecoverable: true,
      suggestion: "Reduce result limit or enable spatial filtering",
    };
  }

  // Handle CORS errors
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return {
      code: WFSErrorCode.CORS_BLOCKED,
      message: "Cross-origin request blocked (CORS)",
      userMessage:
        "This WFS server blocks direct browser requests. A proxy or backend relay may be needed.",
      isRecoverable: false,
      suggestion: "Try a different WFS endpoint or contact your administrator",
    };
  }

  // Handle network errors
  if (error instanceof TypeError) {
    return {
      code: WFSErrorCode.NETWORK_ERROR,
      message: error.message,
      userMessage: "Network connection failed. Check your internet connection.",
      isRecoverable: true,
      suggestion: "Try again in a moment",
    };
  }

  // Handle HTTP responses
  if (response) {
    if (response.status === 429) {
      return {
        code: WFSErrorCode.RATE_LIMITED,
        message: "HTTP 429: Too many requests",
        userMessage: "You've made too many requests. Please wait a moment and try again.",
        isRecoverable: true,
        suggestion: "Wait 30-60 seconds before retrying",
      };
    }

    if (response.status === 401) {
      return {
        code: WFSErrorCode.UNAUTHORIZED,
        message: "HTTP 401: Unauthorized",
        userMessage: "This WFS endpoint requires authentication.",
        isRecoverable: false,
        suggestion: "Check if the endpoint requires API key or credentials",
      };
    }

    if (response.status === 403) {
      return {
        code: WFSErrorCode.CORS_BLOCKED,
        message: "HTTP 403: Forbidden (possibly CORS)",
        userMessage: "The server blocked this request. This is usually a CORS issue.",
        isRecoverable: false,
        suggestion: "Try from a different network or use a proxy service",
      };
    }

    if (response.status === 404) {
      return {
        code: WFSErrorCode.NOT_FOUND,
        message: "HTTP 404: Not found",
        userMessage: "The WFS endpoint or feature type was not found.",
        isRecoverable: true,
        suggestion: "Check the endpoint URL and feature type name",
      };
    }

    if (response.status >= 500) {
      return {
        code: WFSErrorCode.SERVER_ERROR,
        message: `HTTP ${response.status}: Server error`,
        userMessage: "The WFS server is having issues. Please try again later.",
        isRecoverable: true,
        suggestion: "Try again in a few minutes",
      };
    }

    if (!response.ok) {
      return {
        code: WFSErrorCode.SERVER_ERROR,
        message: `HTTP ${response.status}: ${response.statusText}`,
        userMessage: `Server returned an error: ${response.status}`,
        isRecoverable: true,
        suggestion: "Try again or use a different endpoint",
      };
    }
  }

  // Generic error
  return {
    code: WFSErrorCode.UNKNOWN,
    message: error instanceof Error ? error.message : "Unknown error",
    userMessage: "An unexpected error occurred. Please try again.",
    isRecoverable: true,
  };
}

/**
 * Validate GeoJSON response and detect malformed data.
 */
export function validateGeoJSON(data: unknown): WFSError | null {
  if (typeof data !== "object" || !data) {
    return {
      code: WFSErrorCode.MALFORMED_GEOJSON,
      message: "Response is not valid JSON",
      userMessage: "The server response was not valid. The endpoint may be down or misconfigured.",
      isRecoverable: true,
      suggestion: "Try a different endpoint",
    };
  }

  const obj = data as Record<string, unknown>;

  // Check for WFS error response
  if (obj.type === "error" || obj.error) {
    return {
      code: WFSErrorCode.INVALID_RESPONSE,
      message: `WFS error: ${obj.error || obj.message || "Unknown"}`,
      userMessage: `Server returned an error: ${obj.message || "Check your query parameters"}`,
      isRecoverable: true,
      suggestion: "Verify the feature type name and spatial bounds",
    };
  }

  // Check for empty FeatureCollection
  if (obj.type === "FeatureCollection") {
    if (!Array.isArray(obj.features)) {
      return {
        code: WFSErrorCode.MALFORMED_GEOJSON,
        message: "FeatureCollection missing 'features' array",
        userMessage: "The server response was malformed.",
        isRecoverable: true,
      };
    }
  } else if (obj.type !== "Feature") {
    return {
      code: WFSErrorCode.MALFORMED_GEOJSON,
      message: `Unexpected GeoJSON type: ${obj.type}`,
      userMessage: "The server returned unexpected data format.",
      isRecoverable: true,
    };
  }

  return null;
}

/**
 * Check if result set is too large for performance and suggest mitigations.
 */
export function checkResultSetSize(
  count: number,
  limit: number,
): { warning: string; suggestion: string } | null {
  if (count >= limit) {
    return {
      warning: `Query returned ${count}+ features (hit limit of ${limit})`,
      suggestion:
        "Results may be truncated. Use spatial filtering or attribute filters to reduce data.",
    };
  }

  if (count > 2000) {
    return {
      warning: `Large result set (${count} features) may render slowly`,
      suggestion: "Enable feature simplification or add spatial/attribute filters",
    };
  }

  if (count > 5000) {
    return {
      warning: `Very large result set (${count} features) will render very slowly`,
      suggestion:
        "This will impact performance. Consider downloading the data separately or using tiles instead.",
    };
  }

  return null;
}

/**
 * Parse WFS error response (XML).
 */
export function parseWFSErrorResponse(xmlText: string): string | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for parse error
    if (xmlDoc.documentElement.tagName === "parsererror") {
      return "Invalid XML response";
    }

    // Look for ExceptionText element
    const exceptionText = xmlDoc.querySelector(
      "ExceptionText, ows\\:ExceptionText, Exception",
    );
    if (exceptionText) {
      return exceptionText.textContent || "Unknown WFS error";
    }

    // Look for Error element
    const error = xmlDoc.querySelector("Error, error");
    if (error) {
      return error.textContent || "Unknown WFS error";
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Create a recoverable error with retry suggestion.
 */
export function createRecoverableError(message: string, userAction: string): WFSError {
  return {
    code: WFSErrorCode.UNKNOWN,
    message,
    userMessage: message,
    isRecoverable: true,
    suggestion: userAction,
  };
}

/**
 * Format error for display to user.
 */
export function formatErrorForDisplay(error: WFSError): {
  title: string;
  message: string;
  action?: string;
} {
  return {
    title: error.code === WFSErrorCode.CORS_BLOCKED ? "⚠️ CORS Issue" : "❌ Error",
    message: error.userMessage,
    action: error.suggestion
      ? `Try: ${error.suggestion}`
      : error.isRecoverable
        ? "You can try again"
        : "This may require admin help",
  };
}

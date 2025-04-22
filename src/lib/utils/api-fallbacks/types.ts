/**
 * Interface for API fallback handling
 * 
 * This interface defines the structure for providing fallback data
 * when an API request fails. This is useful for:
 * 1. Providing demos when API keys aren't configured
 * 2. Graceful degradation when APIs are unavailable
 * 3. Testing without hitting external APIs
 */

export interface ApiFallbackProvider<T, P = any> {
  /**
   * Check if a fallback is needed based on the error
   */
  shouldProvideFallback(error: unknown): boolean;
  
  /**
   * Generate fallback data based on the parameters that would have been
   * passed to the real API
   */
  getFallbackData(params: P): T;
  
  /**
   * Optional method to get contextual information about why
   * the fallback is being used
   */
  getFallbackContext?(): {
    message: string;
    severity: 'info' | 'warning' | 'error';
    isMock: boolean;
  };
}

/**
 * Generic function to wrap API calls with fallback handling
 * 
 * @param apiCall The actual API function to call
 * @param fallbackProvider The provider for fallback data
 * @param params The parameters to pass to both the API and fallback provider
 * @returns The API response or fallback data
 */
export async function withFallback<T, P>(
  apiCall: (params: P) => Promise<T>,
  fallbackProvider: ApiFallbackProvider<T, P>,
  params: P
): Promise<T> {
  try {
    return await apiCall(params);
  } catch (error) {
    console.error('API call failed, using fallback:', error);
    
    if (fallbackProvider.shouldProvideFallback(error)) {
      // Log fallback context if available
      if (fallbackProvider.getFallbackContext) {
        const context = fallbackProvider.getFallbackContext();
        console.log(`Using ${context.isMock ? 'mock' : 'fallback'} data: ${context.message}`);
      }
      
      return fallbackProvider.getFallbackData(params);
    }
    
    // If the fallback provider decides not to handle this error, rethrow it
    throw error;
  }
} 
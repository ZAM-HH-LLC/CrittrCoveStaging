/**
 * Utility functions for URL generation and sharing
 */

/**
 * Converts a professional name to a URL-friendly slug
 * @param {string} name - The professional's name
 * @returns {string} - URL-friendly slug
 */
export const createProfessionalSlug = (name) => {
  if (!name || typeof name !== 'string') {
    return 'professional';
  }
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Generates a shareable URL for a professional profile
 * @param {Object} professional - Professional data
 * @param {string} baseUrl - Base URL of the application
 * @returns {string} - Complete shareable URL
 */
export const generateProfessionalUrl = (professional, baseUrl = '') => {
  if (!professional?.professional_id) {
    return baseUrl;
  }
  
  const slug = createProfessionalSlug(professional.name);
  const professionalId = professional.professional_id.toString();
  
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  
  return `${cleanBaseUrl}/professionals/${slug}/${professionalId}`;
};

/**
 * Shares a professional profile using native share API or fallback
 * @param {Object} professional - Professional data
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} - Success/failure of share operation
 */
export const shareProfessionalProfile = async (professional, baseUrl = '') => {
  if (!professional) {
    return false;
  }
  
  const url = generateProfessionalUrl(professional, baseUrl);
  const title = `${professional.name} - Pet Care Professional`;
  const text = `Check out ${professional.name}'s professional profile on CrittrCove${professional.location ? ` in ${professional.location}` : ''}!`;
  
  try {
    // Check if native sharing is available (mobile browsers, PWA)
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title,
        text,
        url
      });
      return true;
    }
    
    // Fallback for desktop - copy to clipboard and show notification
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    
    // Final fallback - create temporary textarea for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
    
  } catch (error) {
    // Check if it's an AbortError (user cancelled sharing)
    if (error.name === 'AbortError') {
      // User cancelled sharing, this is not an error
      return true;
    }
    console.error('Error sharing profile:', error);
    return false;
  }
};
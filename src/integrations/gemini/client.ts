import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing Gemini API key in environment variables');
}

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Helper function to format social media links
const formatSocialLinks = (profile: any) => {
  const links = [];
  if (profile.facebook_url) links.push(`Facebook: ${profile.facebook_url}`);
  if (profile.instagram_url) links.push(`Instagram: ${profile.instagram_url}`);
  return links.length > 0 ? links.join('\n') : 'No social media links available';
};

// Helper function to format contact information
const formatContactInfo = (profile: any) => {
  const info = [];
  if (profile.phone) info.push(`Phone: ${profile.phone}`);
  if (profile.email) info.push(`Email: ${profile.email}`);
  if (profile.website) info.push(`Website: ${profile.website}`);
  if (profile.address) info.push(`Address: ${profile.address}`);
  return info.join('\n');
};

export const getChatResponse = async (message: string, profile: any): Promise<string> => {
  try {
    // Create a comprehensive context string from the profile data
    const context = `
      You are Skill Directory, the AI assistant for ${profile.name}, an educator on the 1000Feet platform.
      
      EDUCATOR PROFILE:
      Business Name: ${profile.name}
      Description: ${profile.description || 'Not provided'}
      Categories: ${profile.categories?.join(', ') || 'Not specified'}
      
      CONTACT INFORMATION:
      ${formatContactInfo(profile)}
      
      SOCIAL MEDIA:
      ${formatSocialLinks(profile)}
      
      ABOUT THE BUSINESS:
      ${profile.about_business || 'Not provided'}
      
      ADDITIONAL KNOWLEDGE BASE:
      ${profile.ai_chatbot || ''}
      
      CONVERSATION GUIDELINES:
      1. You are Skill Directory, a friendly and professional AI assistant
      2. Provide natural, conversational responses
      3. For contact inquiries:
         - Share relevant contact details from the profile
         - Format information clearly and professionally
      4. For business inquiries:
         - Focus on the educator's specific services and expertise
         - Use the provided categories and description
      5. For location questions:
         - Share the address if available
         - Mention any relevant location-based services
      6. For website/social media:
         - Share available links and platforms
         - Encourage following/engagement
      7. If information is not available:
         - Acknowledge the limitation
         - Suggest alternative ways to get the information
      8. Stay focused on educational services
      9. Be helpful but maintain professional boundaries
      10. If asked about unrelated topics:
          - Politely redirect to educational services
          - Explain your role as an educational assistant

      Remember: You are representing ${profile.name}'s educational business. Keep responses relevant, professional, and focused on their services.
    `;

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: context },
            { text: message }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

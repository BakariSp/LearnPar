import { apiClient } from '../auth';

export interface CardResource {
  url: string;
  title: string;
}

export interface RelatedCard {
  id?: number;
  keyword: string;
  question: string;
  answer: string;
  explanation: string;
  difficulty: string;
  resources: CardResource[];
}

export interface AskQuestionRequest {
  query: string;
  card_id?: number;
  section_id?: number;
  difficulty_level?: string;
}

export interface AskQuestionResponse {
  answer: string;
  related_card?: RelatedCard;
  context?: {
    current_card_id?: number;
    section_id?: number;
    section_title?: string;
    course_title?: string;
  };
  status: {
    success: boolean;
    has_related_card: boolean;
    message?: string;
  };
}

export interface AddCardRequest {
  card_data: RelatedCard;
  section_id: number;
}

export interface AddCardResponse {
  card: RelatedCard;
  status: {
    success: boolean;
    message?: string;
  };
}

export interface GenerateCardsRequest {
  topic: string;
  num_cards?: number;
  section_id?: number;
  course_title?: string;
  difficulty_level?: string;
}

export type GenerateCardsResponse = RelatedCard[];

/**
 * Ask a question to the learning assistant
 */
export const askQuestion = async (request: AskQuestionRequest): Promise<AskQuestionResponse> => {
  const response = await apiClient('/api/learning-assistant/ask', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response) {
    throw new Error('Failed to connect to learning assistant API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to get response from learning assistant (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Add a card to a section
 */
export const addCard = async (request: AddCardRequest): Promise<AddCardResponse> => {
  const response = await apiClient('/api/learning-assistant/add-card', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response) {
    throw new Error('Failed to connect to learning assistant API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to add card to study materials (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Generate multiple cards for a topic
 */
export const generateCards = async (request: GenerateCardsRequest): Promise<GenerateCardsResponse> => {
  const response = await apiClient('/api/learning-assistant/generate-cards', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response) {
    throw new Error('Failed to connect to learning assistant API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to generate cards (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Unsave a card (remove from user's collection)
 */
export const unsaveCard = async (cardId: number): Promise<{ detail: string }> => {
  const response = await apiClient(`/api/users/me/learning-paths/cards/${cardId}`, {
    method: 'DELETE',
  });

  if (!response) {
    throw new Error('Failed to connect to API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to unsave card (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Delete a card from the system (admin only)
 */
export const deleteCard = async (cardId: number): Promise<{ detail: string }> => {
  const response = await apiClient(`/api/cards/${cardId}`, {
    method: 'DELETE',
  });

  if (!response) {
    throw new Error('Failed to connect to API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to delete card (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Remove a card from a specific section
 */
export const removeCardFromSection = async (cardId: number, sectionId: number): Promise<{ detail: string }> => {
  const response = await apiClient(`/api/users/me/learning-paths/cards/${cardId}?section_id=${sectionId}`, {
    method: 'DELETE',
  });

  if (!response) {
    throw new Error('Failed to connect to API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to remove card from section (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
};

/**
 * Remove a card from all sections
 */
export const removeCardFromAllSections = async (cardId: number): Promise<{ detail: string }> => {
  const response = await apiClient(`/api/users/me/learning-paths/cards/${cardId}`, {
    method: 'DELETE',
  });

  if (!response) {
    throw new Error('Failed to connect to API');
  }

  if (!response.ok) {
    const errorStatus = response.status;
    let errorMessage = `Failed to remove card from all sections (${errorStatus})`;
    
    try {
      // Try to get more detailed error information
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = `API Error: ${errorData.detail}`;
      }
    } catch (e) {
      // Unable to parse JSON response, use default error message
      console.error('Could not parse error response as JSON');
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
}; 
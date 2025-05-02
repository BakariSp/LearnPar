import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LearnAssistant.module.css';
import sharedStyles from '../styles';
import { 
  askQuestion, 
  addCard, 
  generateCards, 
  unsaveCard, 
  deleteCard,
  removeCardFromSection,
  removeCardFromAllSections,
  type RelatedCard,
  type CardResource 
} from '../../../../services/api/learningAssistant';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

type LearnAssistantProps = {
  currentCardId?: number | null;
  currentSectionId?: number | null;
  sectionTitle?: string;
  courseTitle?: string;
  difficulty?: string;
  isAdmin?: boolean;
  userToken?: string;
  onAddCard?: (card: RelatedCard, sectionId: number) => void;
  onUnsaveCard?: (cardId: number) => void;
  onRefreshCards?: () => void;
};

const LearnAssistant: React.FC<LearnAssistantProps> = ({
  currentCardId,
  currentSectionId,
  sectionTitle = '',
  courseTitle = '',
  difficulty = 'intermediate',
  isAdmin = false,
  userToken = '',
  onAddCard,
  onUnsaveCard,
  onRefreshCards,
}) => {
  const { t } = useTranslation('common');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relatedCard, setRelatedCard] = useState<RelatedCard | null>(null);
  const [generatedCards, setGeneratedCards] = useState<RelatedCard[]>([]);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [savedCards, setSavedCards] = useState<number[]>([]);
  const [isUnsaving, setIsUnsaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with a welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('learnAssistant.welcome', 'Hi there! I can help you understand this card and learning path better. I have information about the current content and can provide deeper explanations. Ask me anything, use the quick action buttons below, or try "generate cards about [topic]" to create study materials!'),
        timestamp: new Date(),
      },
    ]);
  }, [t]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on initial load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to generate multiple cards for a topic
  const handleGenerateCards = async (topic: string, numCards: number = 3) => {
    if (!topic.trim() || isLoading) return;

    setIsLoading(true);
    setGeneratedCards([]);

    // Create a user message about generating cards
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `Generate ${numCards} cards about ${topic}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Prepare the request data
      const requestData = {
        topic: topic.trim(),
        num_cards: numCards,
        section_id: currentSectionId || undefined,
        course_title: courseTitle || undefined,
        difficulty_level: difficulty
      };

      // Add a system message about generation in progress
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: t('learnAssistant.generatingCards', 'Generating {{count}} cards about "{{topic}}"...', { count: numCards, topic }),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, systemMessage]);

      // Use the API service
      const data = await generateCards(requestData);

      // If we got cards back
      if (data && data.length > 0) {
        // Store the generated cards
        setGeneratedCards(data);
        setRelatedCard(null); // Clear any previous related card

        // Add success message
        const successMessage: Message = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: t('learnAssistant.cardsGenerated', 'I\'ve generated {{count}} cards about "{{topic}}". You can review them in the "Generated Cards" tab.', { count: data.length, topic }),
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error(t('learnAssistant.noCardsGenerated', 'No cards could be generated for this topic.'));
      }
    } catch (error) {
      console.error('Error generating cards:', error);
      
      // Extract a readable error message if possible
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = String(error);
      }
      
      // Add system error message
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: t('learnAssistant.errorGeneratingCards', 'Failed to generate cards: {{error}}', { 
          error: errorMessage || t('learnAssistant.unknownError', 'Unknown error')
        }),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if a message might be a request to generate cards
  const handleUserMessage = async (message: string) => {
    // Simple pattern matching to detect card generation requests
    const generatePattern = /generate\s+(\d+)?\s*cards?\s+(?:about|for|on)?\s+(.+)/i;
    const match = message.match(generatePattern);
    
    if (match) {
      const numCards = match[1] ? parseInt(match[1], 10) : 3;
      const topic = match[2].trim();
      
      if (topic) {
        await handleGenerateCards(topic, numCards);
        return true; // Indicate that we handled this as a special command
      }
    }
    
    return false; // Not a card generation request
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if this is a card generation request
      const isCardGenerationRequest = await handleUserMessage(userMessage.content);
      
      // If it was handled as a card generation request, we're done
      if (isCardGenerationRequest) {
        setIsLoading(false);
        return;
      }

      // Otherwise, proceed with normal question handling
      // Prepare the request data
      const requestData = {
        query: userMessage.content,
        card_id: currentCardId || undefined,
        section_id: currentSectionId || undefined,
        difficulty_level: difficulty
      };

      // Use the API service instead of direct fetch
      const data = await askQuestion(requestData);

      // Add assistant's response to chat
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update context information if provided
      if (data.context) {
        // If we have updated context about the current card or section, we can
        // use this information to update the UI if needed
        console.log('Context information:', data.context);
      }

      // If there's a related card, store it
      if (data.status && data.status.has_related_card && data.related_card) {
        setRelatedCard(data.related_card);
        setShowFullAnswer(false); // Reset the answer expansion state for new cards
        
        // Clear any previously generated cards when showing a related card
        setGeneratedCards([]);
      }
    } catch (error) {
      console.error('Error asking question:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: t('learnAssistant.error', 'Sorry, I encountered an error. Please try again later.'),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (relatedCard && currentSectionId) {
      setIsLoading(true);
      
      try {
        // Prepare the request data
        const requestData = {
          card_data: relatedCard,
          section_id: currentSectionId
        };

        // Use the API service instead of direct fetch
        const data = await addCard(requestData);

        if (data.status.success) {
          // Add confirmation message
          const confirmationMessage: Message = {
            id: `confirmation-${Date.now()}`,
            role: 'assistant',
            content: t('learnAssistant.cardAdded', 'The card has been added to your study materials!'),
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, confirmationMessage]);
          setRelatedCard(null);
          
          // Notify parent component via callback if provided
          if (onAddCard) {
            onAddCard(data.card, currentSectionId);
          }
          
          // Refresh cards if needed
          if (onRefreshCards) {
            onRefreshCards();
          }
        } else {
          throw new Error(data.status.message || 'Failed to add card');
        }
      } catch (error) {
        console.error('Error adding card:', error);
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: t('learnAssistant.errorAddingCard', 'Failed to add card to your study materials'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearChat = () => {
    // Keep only the welcome message
    setMessages([messages[0]]);
    setRelatedCard(null);
    setGeneratedCards([]);
    setShowFullAnswer(false);
    setShowConfirmDelete(false);
  };

  const renderMessages = () => {
    return messages.map(message => (
      <div 
        key={message.id} 
        className={`${styles.message} ${styles[message.role]}`}
      >
        <div className={styles.messageContent}>
          {message.content}
          
          {/* Add quick action buttons to the welcome message */}
          {message.id === 'welcome' && (
            <div className={styles.quickActions}>
              <button 
                className={styles.actionButton}
                onClick={() => handleSendPresetMessage('Tell me more about this card')}
              >
                {t('learnAssistant.tellMeMore', 'Tell me more about this card')}
              </button>
              
              {currentSectionId && (
                <button 
                  className={styles.actionButton}
                  onClick={() => handleSendPresetMessage(`Tell me about the ${sectionTitle || 'current'} section`)}
                >
                  {t('learnAssistant.explainSection', 'Explain this section')}
                </button>
              )}
              
              <button 
                className={styles.actionButton}
                onClick={() => handleSendPresetMessage('How does this fit into the learning path?')}
              >
                {t('learnAssistant.learningPathContext', 'Learning path context')}
              </button>

              <button 
                className={`${styles.actionButton} ${styles.generateAction}`}
                onClick={() => {
                  // Use the topic from the current card or section title if available
                  const topic = courseTitle || sectionTitle || 'this topic';
                  handleSendPresetMessage(`Generate 3 cards about ${topic}`);
                }}
              >
                {t('learnAssistant.generateExamples', 'Generate example cards')}
              </button>
            </div>
          )}
        </div>
        <div className={styles.messageTime}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    ));
  };

  // Helper function for quick action buttons to send a preset message
  const handleSendPresetMessage = (message: string) => {
    if (isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Process the message using the same logic as handleSendMessage
    (async () => {
      try {
        // Check if this is a card generation request
        const isCardGenerationRequest = await handleUserMessage(userMessage.content);
        
        // If it was handled as a card generation request, we're done
        if (isCardGenerationRequest) {
          setIsLoading(false);
          return;
        }

        // Otherwise, proceed with normal question handling
        // Prepare the request data
        const requestData = {
          query: userMessage.content,
          card_id: currentCardId || undefined,
          section_id: currentSectionId || undefined,
          difficulty_level: difficulty
        };

        // Use the API service instead of direct fetch
        const data = await askQuestion(requestData);

        // Add assistant's response to chat
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update context information if provided
        if (data.context) {
          // If we have updated context about the current card or section, we can
          // use this information to update the UI if needed
          console.log('Context information:', data.context);
        }

        // If there's a related card, store it
        if (data.status && data.status.has_related_card && data.related_card) {
          setRelatedCard(data.related_card);
          setShowFullAnswer(false); // Reset the answer expansion state for new cards
          
          // Clear any previously generated cards when showing a related card
          setGeneratedCards([]);
        }
      } catch (error) {
        console.error('Error processing preset message:', error);
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: t('learnAssistant.error', 'Sorry, I encountered an error. Please try again later.'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    })();
  };

  // Add a function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Function to unsave a card (remove from user's collection)
  const handleUnsaveCard = async (cardId: number) => {
    if (!cardId || isUnsaving) return;
    
    setIsUnsaving(true);
    
    try {
      // Check if we have a valid token
      if (!userToken) {
        console.error('No user token available for card deletion');
        // Add a message to the chat instead of throwing an error
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: t('learnAssistant.authRequired', 'Authentication required to unsave this card. Please try refreshing the page or logging out and back in.'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
        return; // Exit early instead of throwing error
      }
      
      console.log('Using token for unsave card:', userToken.substring(0, 15) + '...');
      
      // Use the direct fetch with token to ensure proper authorization
      const response = await fetch(`/api/users/me/learning-paths/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      if (!response.ok) {
        console.error(`Card unsave failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to unsave card: ${response.status}`);
      }
      
      // Check if there's a response body (some DELETE endpoints return no content)
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { success: true };
      }
      
      // Add system message
      const successMessage: Message = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: t('learnAssistant.cardUnsaved', 'Card removed from your collection'),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, successMessage]);
      setSavedCards(prev => prev.filter(id => id !== cardId));
      
      // If card being displayed is the one unsaved, clear it
      if (relatedCard && relatedCard.id === cardId) {
        setRelatedCard(null);
      }
      
      // Refresh card list if callback provided
      if (onUnsaveCard) {
        onUnsaveCard(cardId);
      }

      if (onRefreshCards) {
        onRefreshCards();
      }
    } catch (error) {
      console.error('Error unsaving card:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: t('learnAssistant.errorUnsavingCard', 'Failed to remove card from your collection'),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUnsaving(false);
    }
  };

  // Function to completely delete a card (admin only)
  const handleDeleteCard = async (cardId: number) => {
    if (!cardId || isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      // Check if we have a valid token
      if (!userToken) {
        console.error('No user token available for card deletion');
        // Add a message to the chat instead of throwing an error
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'system',
          content: t('learnAssistant.authRequired', 'Authentication required to delete this card. Please try refreshing the page or logging out and back in.'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setShowConfirmDelete(false);  // Close the confirm dialog
        return; // Exit early instead of throwing error
      }
      
      console.log('Using token for delete card:', userToken.substring(0, 15) + '...');
      
      // Handle admin deletion - still using deleteCard for admin users to completely delete from system
      if (isAdmin) {
        const url = `/api/cards/${cardId}`;
        console.log('Admin delete URL:', url);
        
        // Use direct fetch with admin token
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        if (!response.ok) {
          console.error(`Admin card delete failed with status: ${response.status}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to delete card: ${response.status}`);
        }
        
        // Check if there's a response body (some DELETE endpoints return no content)
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { success: true };
        }
        
        // Add system message
        const successMessage: Message = {
          id: `system-${Date.now()}`,
          role: 'system',
          content: t('learnAssistant.cardDeleted', 'Card permanently deleted from the system'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, successMessage]);
      } else if (currentSectionId) {
        const url = `/api/users/me/learning-paths/cards/${cardId}?section_id=${currentSectionId}`;
        console.log('Section delete URL:', url);
        
        // For regular users, just remove from current section with token
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        if (!response.ok) {
          console.error(`Card section removal failed with status: ${response.status}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to remove card from section: ${response.status}`);
        }
        
        // Check if there's a response body (some DELETE endpoints return no content)
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { success: true };
        }
        
        // Add system message
        const successMessage: Message = {
          id: `system-${Date.now()}`,
          role: 'system',
          content: t('learnAssistant.cardRemovedFromSection', 'Card removed from this section'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, successMessage]);
      } else {
        const url = `/api/users/me/learning-paths/cards/${cardId}`;
        console.log('All sections delete URL:', url);
        
        // If no section ID, remove from all sections with token
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        if (!response.ok) {
          console.error(`Card removal from all sections failed with status: ${response.status}`);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to remove card from all sections: ${response.status}`);
        }
        
        // Check if there's a response body (some DELETE endpoints return no content)
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { success: true };
        }
        
        // Add system message
        const successMessage: Message = {
          id: `system-${Date.now()}`,
          role: 'system',
          content: t('learnAssistant.cardRemovedFromAllSections', 'Card removed from all sections'),
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, successMessage]);
      }
      
      // If card being displayed is the one deleted, clear it
      if (relatedCard && relatedCard.id === cardId) {
        setRelatedCard(null);
      }
      
      // Always refresh card list after deletion
      if (onRefreshCards) {
        onRefreshCards();
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: t('learnAssistant.errorDeletingCard', 'Failed to delete card from the system'),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className={styles.learnAssistant}>
      <div className={styles.header}>
        <h3>{t('learnAssistant.title', 'Learning Assistant')}</h3>
        {messages.length > 1 && (
          <button 
            className={styles.clearButton} 
            onClick={clearChat}
            aria-label={t('learnAssistant.clearChat', 'Clear chat')}
          >
            {t('learnAssistant.clearChat', 'Clear chat')}
          </button>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.messagesContainer}>
          {renderMessages()}
          {isLoading && (
            <div className={`${styles.message} ${styles.assistant}`}>
              <div className={styles.loadingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {relatedCard && (
          <div className={styles.relatedCard}>
            <h4>{t('learnAssistant.relatedCard', 'Related Card')}</h4>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.cardKeyword}>{relatedCard.keyword}</div>
                <div className={styles.cardActions}>
                  {relatedCard.id && (
                    <button
                      className={styles.unsaveButton}
                      onClick={() => handleUnsaveCard(relatedCard.id as number)}
                      disabled={isUnsaving}
                      title={t('learnAssistant.unsaveCard', 'Remove from collection')}
                    >
                      ✕
                    </button>
                  )}
                  {isAdmin && relatedCard.id && (
                    <button
                      className={styles.deleteButton}
                      onClick={() => setShowConfirmDelete(true)}
                      disabled={isDeleting}
                      title={t('learnAssistant.deleteCard', 'Delete from system')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.cardQuestion}>{relatedCard.question}</div>
              <div className={styles.cardAnswer}>
                <h5>{t('learnAssistant.answer', 'Answer')}</h5>
                <p>
                  {showFullAnswer 
                    ? relatedCard.answer 
                    : truncateText(relatedCard.answer, 100)}
                </p>
                {relatedCard.answer.length > 100 && (
                  <button 
                    className={styles.toggleAnswerButton}
                    onClick={() => setShowFullAnswer(!showFullAnswer)}
                  >
                    {showFullAnswer 
                      ? t('learnAssistant.showLess', 'Show less') 
                      : t('learnAssistant.showMore', 'Show more')}
                  </button>
                )}
              </div>
              <button
                className={styles.addCardButton}
                onClick={handleAddCard}
                disabled={!currentSectionId || isLoading}
              >
                {t('learnAssistant.addToStudyMaterials', 'Add to Study Materials')}
              </button>
            </div>
          </div>
        )}

        {generatedCards.length > 0 && (
          <div className={styles.generatedCards}>
            <h4>{t('learnAssistant.generatedCards', 'Generated Cards')}</h4>
            {generatedCards.map((card, index) => (
              <div key={`generated-${index}`} className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardKeyword}>{card.keyword}</div>
                </div>
                <div className={styles.cardQuestion}>{card.question}</div>
                <div className={styles.cardAnswer}>
                  <h5>{t('learnAssistant.answer', 'Answer')}</h5>
                  <p>{truncateText(card.answer, 100)}</p>
                  {card.answer.length > 100 && (
                    <button 
                      className={styles.toggleAnswerButton}
                      onClick={() => {
                        // Create a copy of the card with expanded answer
                        setRelatedCard(card);
                        setShowFullAnswer(true);
                        // Clear generated cards to focus on the selected one
                        setGeneratedCards([]);
                      }}
                    >
                      {t('learnAssistant.viewDetails', 'View Details')}
                    </button>
                  )}
                </div>
                <button
                  className={styles.addCardButton}
                  onClick={() => {
                    setRelatedCard(card);
                    handleAddCard();
                  }}
                  disabled={!currentSectionId || isLoading}
                >
                  {t('learnAssistant.addToStudyMaterials', 'Add to Study Materials')}
                </button>
              </div>
            ))}
          </div>
        )}

        {showConfirmDelete && relatedCard && relatedCard.id && (
          <div className={styles.confirmDialog}>
            <div className={styles.confirmDialogContent}>
              <h4>{t('learnAssistant.confirmDelete', 'Confirm Delete')}</h4>
              <p>{t('learnAssistant.confirmDeleteMessage', 'Are you sure you want to permanently delete this card?')}</p>
              <div className={styles.confirmDialogActions}>
                <button 
                  className={styles.confirmButton}
                  onClick={() => handleDeleteCard(relatedCard.id as number)}
                  disabled={isDeleting}
                >
                  {t('learnAssistant.confirmButton', 'Delete')}
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  {t('learnAssistant.cancelButton', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('learnAssistant.askPlaceholder', 'Ask about this topic...')}
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            aria-label={t('learnAssistant.send', 'Send')}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearnAssistant; 
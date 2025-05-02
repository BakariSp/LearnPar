'use client';

import { Card, Typography } from 'antd';
import { CardResponse } from '@/services/api';

const { Title, Paragraph, Text } = Typography;

interface PreviewCardSectionProps {
  cards: CardResponse[];
  maxPreviewCards?: number;
}

/**
 * Component that displays a preview of cards with a limit on how many are fully shown
 */
const PreviewCardSection = ({ cards, maxPreviewCards = 2 }: PreviewCardSectionProps) => {
  if (!cards || cards.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <Text type="secondary">No learning cards available</Text>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      {cards.slice(0, maxPreviewCards).map((card) => (
        <Card key={card.id} className="hover:shadow-md transition-shadow">
          <Title level={5}>{card.keyword}</Title>
          <Paragraph>
            {card.explanation.length > 150 
              ? card.explanation.substring(0, 150) + '...' 
              : card.explanation}
          </Paragraph>
        </Card>
      ))}
      {cards.length > maxPreviewCards && (
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <Text type="secondary">+ {cards.length - maxPreviewCards} more cards</Text>
        </div>
      )}
    </div>
  );
};

export default PreviewCardSection; 
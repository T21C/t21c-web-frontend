import React from 'react';
import './commentFormatter.css';

export const CommentFormatter = ({ prefix = "id", children }) => {
  const formatComment = (text) => {
    // Match pattern: id:1234 or ID:1234 or any other prefix
    const idPattern = new RegExp(`\\b(${prefix}:)(\\d+)\\b`, 'gi');
    
    // Split the text into parts based on the pattern
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = idPattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the formatted link
      const levelId = match[2];
      parts.push(
        <a
          key={match.index}
          href={`${import.meta.env.VITE_OWN_URL}/levels/${levelId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="level-link"
        >
          Level {levelId}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Convert children to string if it's not already
  const textContent = React.Children.toArray(children).join('');

  return <div className="formatted-comment">{formatComment(textContent)}</div>;
}; 
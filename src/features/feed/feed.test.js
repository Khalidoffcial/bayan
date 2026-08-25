import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FeedUser, FeedActions, ArticleCard } from './index';

describe('Feed Feature Components', () => {
  const mockUser = {
    Id_user: '123',
    F_user: 'Ahmed',
    S_user: '@ahmed',
    imgProfile: 'https://example.com/avatar.jpg',
  };

  test('renders FeedUser with user names', () => {
    render(
      <BrowserRouter>
        <FeedUser userData={mockUser} />
      </BrowserRouter>
    );
    expect(screen.getByText('Ahmed')).toBeInTheDocument();
    expect(screen.getByText('@ahmed')).toBeInTheDocument();
  });

  test('renders FeedActions and triggers callbacks', () => {
    const handleLike = jest.fn();
    const handleComment = jest.fn();
    const handleShare = jest.fn();

    render(
      <FeedActions
        itemId="post1"
        liked={false}
        likesCount={5}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /like/i }));
    expect(handleLike).toHaveBeenCalledWith('post1');
  });

  test('renders ArticleCard with title and description', () => {
    const mockArticle = {
      id: 'art1',
      title: 'Deep Learning Insights',
      descrip: 'An exploration of modern AI.',
      userData: mockUser,
    };

    render(
      <BrowserRouter>
        <ArticleCard item={mockArticle} />
      </BrowserRouter>
    );

    expect(screen.getByText('Deep Learning Insights')).toBeInTheDocument();
    expect(screen.getByText('An exploration of modern AI.')).toBeInTheDocument();
  });
});

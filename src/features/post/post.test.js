import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PostHeader, PostBody, PostActions, PostReading } from './index';

describe('Post Feature Components', () => {
  const mockUser = {
    Id_user: 'u123',
    F_user: 'Mariam',
    S_user: '@mariam',
    imgProfile: 'https://example.com/mariam.jpg',
  };

  test('renders PostHeader with user information', () => {
    render(
      <HelmetProvider>
        <PostHeader userData={mockUser} imageUrl="https://example.com/post.jpg" />
      </HelmetProvider>
    );

    expect(screen.getByText('Mariam')).toBeInTheDocument();
    expect(screen.getByText('@mariam')).toBeInTheDocument();
  });

  test('renders PostBody with content', () => {
    render(
      <PostBody
        content="<p>Insightful post content</p>"
        imageUrl="https://example.com/preview.jpg"
        contentDir="ltr"
      />
    );

    expect(screen.getByText('Insightful post content')).toBeInTheDocument();
    expect(screen.getByAltText('Post Content')).toBeInTheDocument();
  });

  test('triggers PostActions callbacks', () => {
    const handleLike = jest.fn();
    const handleComment = jest.fn();
    const handleShare = jest.fn();

    render(
      <PostActions
        liked={true}
        likesCount={9}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
      />
    );

    expect(screen.getByText('9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /like/i }));
    expect(handleLike).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /comment/i }));
    expect(handleComment).toHaveBeenCalled();
  });

  test('renders PostReading fallback when no post state is present', () => {
    render(
      <BrowserRouter>
        <HelmetProvider>
          <PostReading />
        </HelmetProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/post not found/i)).toBeInTheDocument();
  });
});

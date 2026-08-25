import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ArticleHeader, ArticleBody, ArticleActions, ArticleReading } from './index';

describe('Article Feature Components', () => {
  test('renders ArticleHeader with title and description', () => {
    render(
      <HelmetProvider>
        <ArticleHeader
          title="Understanding Modern Architecture"
          descrip="A comprehensive overview of clean code."
          titleDir="ltr"
        />
      </HelmetProvider>
    );

    expect(screen.getByText('Understanding Modern Architecture')).toBeInTheDocument();
    expect(screen.getByText('A comprehensive overview of clean code.')).toBeInTheDocument();
  });

  test('renders ArticleBody with HTML content and image', () => {
    render(
      <ArticleBody
        content="<p>Main article text</p>"
        imageUrl="https://example.com/banner.jpg"
        contentDir="ltr"
      />
    );

    expect(screen.getByText('Main article text')).toBeInTheDocument();
    expect(screen.getByAltText('Article Main')).toBeInTheDocument();
  });

  test('triggers ArticleActions callbacks', () => {
    const handleLike = jest.fn();
    const handleComment = jest.fn();
    const handleShare = jest.fn();
    const handleDownloadPDF = jest.fn();

    render(
      <ArticleActions
        liked={false}
        likesCount={12}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onDownloadPDF={handleDownloadPDF}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /like/i }));
    expect(handleLike).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
    expect(handleDownloadPDF).toHaveBeenCalled();
  });

  test('renders ArticleReading not found fallback when no state is passed', () => {
    render(
      <BrowserRouter>
        <HelmetProvider>
          <ArticleReading />
        </HelmetProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/article not found/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WriterToolbar, WriterActions, WriterImages } from './index';

describe('Writer Feature Components', () => {
  test('renders WriterToolbar with content types and handles selection', () => {
    const handleTypeChange = jest.fn();
    render(<WriterToolbar activeType="post" onTypeChange={handleTypeChange} />);

    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByText('Article')).toBeInTheDocument();
    expect(screen.getByText('Novels')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Article'));
    expect(handleTypeChange).toHaveBeenCalledWith('article');
  });

  test('renders WriterActions and handles publish/cancel triggers', () => {
    const handlePublish = jest.fn();
    const handleCancel = jest.fn();

    render(
      <WriterActions
        onPublish={handlePublish}
        onCancel={handleCancel}
        isSubmitting={false}
      />
    );

    expect(screen.getByText('Publish')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Publish'));
    expect(handlePublish).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalled();
  });

  test('renders WriterImages upload card', () => {
    render(
      <WriterImages
        imagesPreview={[]}
        onImageChange={jest.fn()}
        onRemoveImage={jest.fn()}
        onImageClick={jest.fn()}
      />
    );

    expect(screen.getByText(/upload image/i)).toBeInTheDocument();
  });
});

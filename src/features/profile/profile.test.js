import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileHeader, ProfileInfo, ProfileStats, ProfileTabs } from './index';

describe('Profile Feature Components', () => {
  test('renders ProfileHeader with avatar image', () => {
    render(
      <ProfileHeader
        imageUrl="https://example.com/avatar.jpg"
        editable={true}
        onImageClick={jest.fn()}
        onDropdownToggle={jest.fn()}
        dropdownOpen={false}
      />
    );

    expect(screen.getByAltText('Profile')).toBeInTheDocument();
  });

  test('renders ProfileInfo in display mode', () => {
    const handleEditName = jest.fn();
    const handleEditBio = jest.fn();

    render(
      <ProfileInfo
        name="Sarah Connor"
        bio="Software Engineer & Architect"
        editable={true}
        editingName={false}
        editingBio={false}
        onEditName={handleEditName}
        onEditBio={handleEditBio}
        onSaveName={jest.fn()}
        onSaveBio={jest.fn()}
        setName={jest.fn()}
        setBio={jest.fn()}
        followMode={false}
        onFollow={jest.fn()}
        onUnfollow={jest.fn()}
      />
    );

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer & Architect')).toBeInTheDocument();
  });

  test('renders ProfileStats accurately', () => {
    render(<ProfileStats followers={42} following={18} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  test('renders ProfileTabs with unified content tabs and handles clicks', () => {
    const handleTabChange = jest.fn();
    const counts = { all: 4, posts: 2, replies: 1, articles: 1, novels: 0 };

    render(
      <ProfileTabs activeTab="all" onTabChange={handleTabChange} counts={counts} />
    );

    // "All" is the default tab and appears first.
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Replies')).toBeInTheDocument();
    expect(screen.getByText('Articles')).toBeInTheDocument();
    expect(screen.getByText('Novels')).toBeInTheDocument();

    // Counts render when the server provides them.
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Replies'));
    expect(handleTabChange).toHaveBeenCalledWith('replies');
  });
});

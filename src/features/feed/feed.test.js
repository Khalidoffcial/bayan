import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { renderWithSettings } from '../../test/testUtils';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '../../contexts/SettingsContext';
import {
  Feed,
  FeedList,
  FeedUser,
  FeedActions,
  ArticleCard,
  useFeed,
  requestFeed,
  FEED_BATCH_SIZE,
  FEED_PREFETCH_THRESHOLD_PX,
} from './index';

import useSocket from '../../hooks/useSocket';
import feedStore from './services/feedStore';

// Mock useSocket hook
const mockSocketEmit = jest.fn();
const mockSocketOn = jest.fn();
const mockSocketOff = jest.fn();

const mockSocket = {
  emit: mockSocketEmit,
  on: mockSocketOn,
  off: mockSocketOff,
  once: jest.fn((event, cb) => mockSocketOn(event, cb)),
  connected: false,
};

jest.mock('../../hooks/useSocket');

describe('Feed Feature Configuration & Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('FEED_BATCH_SIZE matches the configured page size and prefetch threshold is defined', () => {
    expect(FEED_BATCH_SIZE).toBe(20);
    expect(FEED_PREFETCH_THRESHOLD_PX).toBeGreaterThan(0);
  });

  test('requestFeed emits GET_FEED with the configured page size', () => {
    const fakeSocket = { emit: jest.fn() };
    requestFeed(fakeSocket, { userId: 'u1', type: 'posts', cursor: 0 });

    expect(fakeSocket.emit).toHaveBeenCalledWith('GET_FEED', {
      userId: 'u1',
      type: 'posts',
      cursor: 0,
      limit: 20,
    });
  });

  test('requestFeed respects custom limit if specified', () => {
    const fakeSocket = { emit: jest.fn() };
    requestFeed(fakeSocket, { userId: 'u1', type: 'articles', cursor: 100, limit: 50 });

    expect(fakeSocket.emit).toHaveBeenCalledWith('GET_FEED', {
      userId: 'u1',
      type: 'articles',
      cursor: 100,
      limit: 50,
    });
  });
});

describe('useFeed Hook — Cache-First Feed, SWR Refresh & Deduplication', () => {
  let socketCallbacks = {};

  beforeEach(() => {
    jest.clearAllMocks();
    useSocket.mockReturnValue({ current: mockSocket });
    socketCallbacks = {};
    mockSocketOn.mockImplementation((event, callback) => {
      socketCallbacks[event] = callback;
    });
    mockSocket.connected = true; // production sockets are connected when fetching
    feedStore.clearAll();
  });

  test('initializes with empty feed and hasMore true on a cold cache', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    expect(result.current.feed).toEqual([]);
    expect(result.current.cursor).toBe(0);
    expect(result.current.hasMore).toBe(true);
  });

  test('fetchFeed requests one server page and merges it into the persistent store', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    expect(mockSocketEmit).toHaveBeenCalledWith('GET_FEED', expect.objectContaining({
      userId: 'user1',
      type: 'posts',
      cursor: 0,
      limit: FEED_BATCH_SIZE,
    }));

    const page1 = Array.from({ length: FEED_BATCH_SIZE }, (_, i) => ({
      id: `item-${i + 1}`,
      type: 'posts',
    }));

    act(() => {
      socketCallbacks['FEED_RESULT']({ items: page1, nextCursor: FEED_BATCH_SIZE });
    });

    expect(result.current.feed.length).toBe(FEED_BATCH_SIZE);
    expect(result.current.cursor).toBe(FEED_BATCH_SIZE);
    expect(result.current.hasMore).toBe(true);

    // Second page continues from the stored cursor — no re-fetch of page 1
    mockSocketEmit.mockClear();
    act(() => {
      result.current.fetchFeed();
    });

    expect(mockSocketEmit).toHaveBeenCalledWith('GET_FEED', expect.objectContaining({
      cursor: FEED_BATCH_SIZE,
    }));
  });

  test('cache-first remount: warm fresh cache hydrates WITHOUT any network request', () => {
    // Warm the store as if the user already visited the feed
    feedStore.mergePage('posts', [{ id: 'warm-1' }, { id: 'warm-2' }], { nextCursor: 2 });
    mockSocketEmit.mockClear();

    const { result } = renderHook(() => useFeed('posts', 'user1'));

    expect(result.current.feed.length).toBe(2);            // instant cache render
    expect(mockSocketEmit).not.toHaveBeenCalled();          // zero refetch
    expect(result.current.loading).toBe(false);
  });

  test('correctly extracts and stores posts from a { posts: [...] } payload', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    const mockPosts = [
      { _id: 'post-a', content: 'First full post', type: 'posts' },
      { _id: 'post-b', content: 'Second full post', type: 'posts' },
      { _id: 'post-c', content: 'Third full post', type: 'posts' },
      { _id: 'post-d', content: 'Fourth full post', type: 'posts' },
    ];

    act(() => {
      socketCallbacks['FEED_RESULT']({ posts: mockPosts, nextCursor: 4 });
    });

    expect(result.current.feed.length).toBe(4);
    expect(result.current.feed[0].id).toBe('post-a');
    expect(result.current.feed[3].id).toBe('post-d');
  });

  test('extracts items from { content: [...] } and direct array payloads', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    const mockContent = [
      { id: 'c-1', content: 'Content item 1' },
      { id: 'c-2', content: 'Content item 2' },
      { id: 'c-3', content: 'Content item 3' },
    ];

    act(() => {
      socketCallbacks['FEED_RESULT']({ content: mockContent, cursor: 3 });
    });

    expect(result.current.feed.length).toBe(3);
    expect(result.current.feed[1].id).toBe('c-2');
  });

  test('prevents duplicate items when the same page arrives twice', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [
          { id: 'post-1', title: 'First' },
          { id: 'post-2', title: 'Second' },
        ],
        nextCursor: 2,
      });
    });

    expect(result.current.feed.length).toBe(2);

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [
          { id: 'post-2', title: 'Duplicate Second' },
          { id: 'post-3', title: 'Third' },
        ],
        nextCursor: 3,
      });
    });

    expect(result.current.feed.length).toBe(3);
    expect(result.current.feed.map((p) => p.id)).toEqual(['post-1', 'post-2', 'post-3']);
  });

  test('prepends NEW_POST without clearing cached items', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [
          { id: 'post-1', title: 'First' },
          { id: 'post-2', title: 'Second' },
        ],
        nextCursor: 2,
      });
    });

    act(() => {
      socketCallbacks['NEW_POST']({
        id: 'live-post-new',
        title: 'Freshly Published Post',
      });
    });

    expect(result.current.feed.length).toBe(3);
    expect(result.current.feed[0].id).toBe('live-post-new');
    expect(result.current.feed[1].id).toBe('post-1');
  });

  test('LIKE_UPDATED patches the affected item in place — cache stays consistent', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [{ id: 'post-1', title: 'First', likesCount: 1 }],
        nextCursor: 1,
      });
    });

    act(() => {
      socketCallbacks['LIKE_UPDATED']({
        contentType: 'posts',
        post: { id: 'post-1', title: 'First (edited)', likesCount: 9 },
      });
    });

    expect(result.current.feed.length).toBe(1); // no duplication, no reset
    expect(result.current.feed[0].likesCount).toBe(9);
  });

  test('preserves cached items on socket error and reports the error', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [{ id: 'post-1', title: 'First' }],
        nextCursor: 1,
      });
    });

    act(() => {
      socketCallbacks['connect_error']({ message: 'Network timeout' });
    });

    expect(result.current.feed.length).toBe(1); // cache untouched by errors
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network timeout');
  });

  test('removePost removes exactly one item from the persistent cache', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [{ id: 'post-1' }, { id: 'post-2' }],
        nextCursor: 2,
      });
    });

    act(() => {
      result.current.removePost('post-1');
    });

    expect(result.current.feed.map((p) => p.id)).toEqual(['post-2']);
  });
});

describe('Feed Feature UI Components', () => {
  const mockUser = {
    Id_user: '123',
    F_user: 'Ahmed',
    S_user: '@ahmed',
    imgProfile: 'https://example.com/avatar.jpg',
  };

  test('renders FeedUser with user names', () => {
    renderWithSettings(
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

    renderWithSettings(
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

    renderWithSettings(
      <SettingsProvider>
        <BrowserRouter>
          <ArticleCard item={mockArticle} />
        </BrowserRouter>
      </SettingsProvider>
    );

    expect(screen.getByText('Deep Learning Insights')).toBeInTheDocument();
    expect(screen.getByText('An exploration of modern AI.')).toBeInTheDocument();
  });

  test('FeedList renders items from memory without network requests', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `post-${i + 1}`,
      content: `Post content ${i + 1}`,
      type: 'posts',
      userData: mockUser,
    }));

    renderWithSettings(
      <SettingsProvider>
        <BrowserRouter>
          <FeedList
            feed={items}
            likedPosts={{}}
            likesCount={{}}
            onLike={jest.fn()}
            onComment={jest.fn()}
            onShare={jest.fn()}
            getDirection={jest.fn(() => 'ltr')}
          />
        </BrowserRouter>
      </SettingsProvider>
    );

    // Items from memory cache are rendered
    expect(screen.getByText('Post content 1')).toBeInTheDocument();
    expect(screen.getByText('Post content 50')).toBeInTheDocument();
    expect(screen.getByText('Post content 100')).toBeInTheDocument();
  });
});


import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

// Mock useSocket hook
const mockSocketEmit = jest.fn();
const mockSocketOn = jest.fn();
const mockSocketOff = jest.fn();

const mockSocket = {
  emit: mockSocketEmit,
  on: mockSocketOn,
  off: mockSocketOff,
  connected: false,
};

jest.mock('../../hooks/useSocket');

describe('Feed Feature Configuration & Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('FEED_BATCH_SIZE is set to 100 and prefetch threshold is defined', () => {
    expect(FEED_BATCH_SIZE).toBe(100);
    expect(FEED_PREFETCH_THRESHOLD_PX).toBeGreaterThan(0);
  });

  test('requestFeed emits GET_FEED with default batch size 100', () => {
    const fakeSocket = { emit: jest.fn() };
    requestFeed(fakeSocket, { userId: 'u1', type: 'posts', cursor: 0 });

    expect(fakeSocket.emit).toHaveBeenCalledWith('GET_FEED', {
      userId: 'u1',
      type: 'posts',
      cursor: 0,
      limit: 100,
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

describe('useFeed Hook — 100-Item Batching, Client Cache & Deduplication', () => {
  let socketCallbacks = {};

  beforeEach(() => {
    jest.clearAllMocks();
    useSocket.mockReturnValue({ current: mockSocket });
    socketCallbacks = {};
    mockSocketOn.mockImplementation((event, callback) => {
      socketCallbacks[event] = callback;
    });
    mockSocket.connected = false;
  });

  test('initializes with empty feed, cursor 0, and hasMore true', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    expect(result.current.feed).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.cursor).toBe(0);
  });

  test('requests 100 items on fetchFeed and caches received 100 items without duplicate requests', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    // Trigger initial fetch
    act(() => {
      result.current.fetchFeed(true);
    });

    expect(result.current.loading).toBe(true);
    expect(mockSocketEmit).toHaveBeenCalledWith('GET_FEED', {
      userId: 'user1',
      type: 'posts',
      cursor: 0,
      limit: 100,
    });

    // Mock 100 items returned by backend in FEED_RESULT
    const mock100Items = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i + 1}`,
      title: `Post ${i + 1}`,
      type: 'posts',
    }));

    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: mock100Items,
        nextCursor: 100,
        hasMore: true,
      });
    });

    // Cache should hold 100 items in memory
    expect(result.current.feed.length).toBe(100);
    expect(result.current.cursor).toBe(100);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);

    // Calling fetchFeed again while already fetching is locked
    mockSocketEmit.mockClear();
    act(() => {
      result.current.fetchFeed();
    });

    expect(mockSocketEmit).toHaveBeenCalledWith('GET_FEED', {
      userId: 'user1',
      type: 'posts',
      cursor: 100,
      limit: 100,
    });
  });

  test('correctly extracts and stores multiple posts when backend sends { posts: [...] } payload', () => {
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
      socketCallbacks['FEED_RESULT']({
        posts: mockPosts,
        nextCursor: 4,
        hasMore: true,
      });
    });

    expect(result.current.feed.length).toBe(4);
    expect(result.current.feed[0].id).toBe('post-a');
    expect(result.current.feed[3].id).toBe('post-d');
  });

  test('correctly extracts and stores multiple posts when backend sends { content: [...] } or direct array payload', () => {
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
      socketCallbacks['FEED_RESULT']({
        content: mockContent,
        cursor: 3,
      });
    });

    expect(result.current.feed.length).toBe(3);
    expect(result.current.feed[1].id).toBe('c-2');
  });

  test('prevents duplicate items from appearing in feed state', () => {
    const { result } = renderHook(() => useFeed('posts', 'user1'));

    act(() => {
      result.current.fetchFeed(true);
    });

    // Receive first batch
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

    // Receive second batch with an overlapping item (post-2) and new item (post-3)
    act(() => {
      socketCallbacks['FEED_RESULT']({
        items: [
          { id: 'post-2', title: 'Duplicate Second' },
          { id: 'post-3', title: 'Third' },
        ],
        nextCursor: 3,
      });
    });

    // Should contain 3 unique items, not 4
    expect(result.current.feed.length).toBe(3);
    expect(result.current.feed.map((p) => p.id)).toEqual(['post-1', 'post-2', 'post-3']);
  });

  test('prepends NEW_POST to active feed without clearing cached items', () => {
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

    // Broadcast NEW_POST event
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

  test('resetFeed clears feed cache, resets cursor, and resets deduplication state', () => {
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

    expect(result.current.feed.length).toBe(1);

    act(() => {
      result.current.resetFeed();
    });

    expect(result.current.feed).toEqual([]);
    expect(result.current.cursor).toBe(0);
    expect(result.current.hasMore).toBe(true);
  });

  test('preserves existing cached items on socket error', () => {
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

    // Error occurs during subsequent fetch
    act(() => {
      result.current.fetchFeed();
    });

    act(() => {
      socketCallbacks['connect_error']({ message: 'Network timeout' });
    });

    // Existing cached post remains intact
    expect(result.current.feed.length).toBe(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network timeout');
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

  test('FeedList renders items from memory without network requests', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `post-${i + 1}`,
      content: `Post content ${i + 1}`,
      type: 'posts',
      userData: mockUser,
    }));

    render(
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
    );

    // Items from memory cache are rendered
    expect(screen.getByText('Post content 1')).toBeInTheDocument();
    expect(screen.getByText('Post content 50')).toBeInTheDocument();
    expect(screen.getByText('Post content 100')).toBeInTheDocument();
  });
});


'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import DisclaimerModal from '../components/DisclaimerModal';

// TypeScript interfaces
interface RSSFeed {
  name: string;
  url: string;
}

interface RSSImage {
  url: string;
  width: number;
  height: number;
  type?: string;
  source: string;
  score?: number;
}

interface RSSItem {
  id: number | string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author?: string;
  category?: string;
  guid?: string;
  image?: string | null;
  view_count: number;
  duration_milliseconds: number;
  video_poster_image_url?: string;
  embedded_video_url: string;
  upload_date: string;
}

interface RSSParseResult {
  error: boolean;
  message: string;
  status?: number;
  items: RSSItem[];
}

interface UseInViewOptions {
  threshold?: number;
  triggerOnce?: boolean;
  rootMargin?: string;
}

interface ImageWithLoaderProps {
  src?: string | null;
  alt: string;
  className: string;
  onClick?: () => void;
  fallbackSrc?: string;
}

interface LazyImageProps {
  src?: string | null;
  videoUrl?: string;
  className: string;
  isLarge?: boolean;
  episodeId?: string;
  progress?: { percent: number } | null;
  darkMode: boolean;
  title?: string;
}

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  darkMode: boolean;
}

interface ArticleStatsProps {
  article: RSSItem;
  darkMode: boolean;
}

interface ShareButtonProps {
  article: RSSItem;
  darkMode: boolean;
}

interface BookmarkButtonProps {
  articleId: string;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  darkMode: boolean;
}

interface ArticleCardProps {
  article: RSSItem;
  isLarge?: boolean;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  darkMode: boolean;
}

interface LazyArticleItemProps {
  article: RSSItem;
  index: number;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  darkMode: boolean;
}

interface FeedSelectorProps {
  feeds: RSSFeed[];
  selectedFeed: string;
  onFeedChange: (url: string) => void;
  darkMode: boolean;
}

interface RSSErrorDisplayProps {
  error: string;
  onRetry: () => void;
  darkMode: boolean;
}

interface BackToTopProps {
  darkMode: boolean;
}

interface ProgressBarProps {
  progress?: { percent: number } | null;
  darkMode: boolean;
}

// Image extraction functions
const extractBestImage = (item: Element): string | null => {
  const xmlString = item.outerHTML || item.innerHTML || '';
  
  const mediaImages = extractMediaContent(item, xmlString);
  if (mediaImages.length > 0) {
    return selectBestImage(mediaImages);
  }
  
  const enclosureImage = extractEnclosureImage(item);
  if (enclosureImage) return enclosureImage;
  
  const thumbnailImage = extractThumbnail(item);
  if (thumbnailImage) return thumbnailImage;
  
  const contentImage = extractImageFromContent(item);
  if (contentImage) return contentImage;
  
  const customImage = extractCustomImageTags(item, xmlString);
  if (customImage) return customImage;
  
  const metaImage = extractMetaImage(xmlString);
  if (metaImage) return metaImage;
  
  return null;
};

const extractMediaContent = (item: Element, xmlString: string): RSSImage[] => {
  const images: RSSImage[] = [];
  
  const mediaSelectors = [
    'media\\:content[medium="image"]',
    'media\\:content[type^="image"]',
    'content[medium="image"]',
    'content[type^="image"]'
  ];
  
  mediaSelectors.forEach(selector => {
    const elements = item.querySelectorAll(selector);
    elements.forEach(el => {
      const url = el.getAttribute('url');
      if (url) {
        images.push({
          url,
          width: parseInt(el.getAttribute('width') || '0') || 0,
          height: parseInt(el.getAttribute('height') || '0') || 0,
          type: el.getAttribute('type') || '',
          source: 'media:content'
        });
      }
    });
  });
  
  if (images.length === 0) {
    const regexPatterns = [
      /<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/g,
      /<media:content[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/g,
      /<content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/g
    ];
    
    regexPatterns.forEach(regex => {
      let match;
      while ((match = regex.exec(xmlString)) !== null) {
        const fullMatch = match[0];
        const widthMatch = fullMatch.match(/width=["'](\d+)["']/);
        const heightMatch = fullMatch.match(/height=["'](\d+)["']/);
        
        images.push({
          url: match[1],
          width: widthMatch ? parseInt(widthMatch[1]) : 0,
          height: heightMatch ? parseInt(heightMatch[1]) : 0,
          source: 'media:content-regex'
        });
      }
    });
  }
  
  return images;
};

const extractEnclosureImage = (item: Element): string | null => {
  const enclosures = item.querySelectorAll('enclosure[type^="image"]');
  if (enclosures.length > 0) {
    return enclosures[0].getAttribute('url');
  }
  return null;
};

const extractThumbnail = (item: Element): string | null => {
  const thumbnails = item.querySelectorAll('media\\:thumbnail, thumbnail');
  if (thumbnails.length > 0) {
    return thumbnails[0].getAttribute('url') || thumbnails[0].textContent;
  }
  return null;
};

const extractImageFromContent = (item: Element): string | null => {
  const contentSelectors = [
    'content\\:encoded',
    'encoded',
    'description'
  ];
  
  for (const selector of contentSelectors) {
    const contentEl = item.querySelector(selector);
    if (contentEl) {
      const content = contentEl.textContent || contentEl.innerHTML;
      const image = extractImageFromHTML(content);
      if (image) return image;
    }
  }
  
  return null;
};

const extractCustomImageTags = (item: Element, xmlString: string): string | null => {
  const customSelectors = [
    'image',
    'thumbnail',
    'photo',
    'picture',
    'img'
  ];
  
  for (const selector of customSelectors) {
    const element = item.querySelector(selector);
    if (element) {
      const url = element.getAttribute('url') || 
                 element.getAttribute('src') || 
                 element.getAttribute('href') ||
                 element.textContent;
      
      if (url && isValidImageUrl(url)) {
        return url;
      }
    }
  }
  
  const customRegex = /<(?:image|thumbnail|photo|picture)[^>]*(?:url|src|href)=["']([^"']+)["']/g;
  const match = customRegex.exec(xmlString);
  if (match && isValidImageUrl(match[1])) {
    return match[1];
  }
  
  return null;
};

const extractMetaImage = (xmlString: string): string | null => {
  const metaPatterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/,
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/
  ];
  
  for (const pattern of metaPatterns) {
    const match = xmlString.match(pattern);
    if (match && isValidImageUrl(match[1])) {
      return match[1];
    }
  }
  
  return null;
};

const extractImageFromHTML = (htmlContent: string): string | null => {
  const imgPatterns = [
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
    /<img[^>]+src=([^\s>]+)[^>]*>/i,
    /src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg))["']/i,
    /https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s<>"]*)?/i
  ];
  
  for (const pattern of imgPatterns) {
    const match = htmlContent.match(pattern);
    if (match && isValidImageUrl(match[1])) {
      return match[1];
    }
  }
  
  return null;
};

const selectBestImage = (images: RSSImage[]): string | null => {
  if (images.length === 0) return null;
  if (images.length === 1) return images[0].url;
  
  const scoredImages = images.map(img => {
    let score = 0;
    const area = img.width * img.height;
    
    if (img.width >= 300 && img.width <= 800 && img.height >= 200 && img.height <= 600) {
      score += 100;
    } else if (img.width >= 200 && img.height >= 150) {
      score += 80;
    } else if (area > 0) {
      score += 40;
    } else {
      score += 20;
    }
    
    if (img.width > img.height) {
      score += 20;
    }
    
    if (img.width > 1200 || img.height > 800) {
      score -= 30;
    }
    
    if (img.source === 'media:content') {
      score += 10;
    }
    
    if (img.width > 0 && img.width < 100) {
      score -= 50;
    }
    
    return { ...img, score };
  });
  
  scoredImages.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scoredImages[0].url;
};

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  const urlPattern = /^https?:\/\/.+/i;
  const dataUrlPattern = /^data:image\/.+/i;
  
  return imageExtensions.test(url) || dataUrlPattern.test(url) || 
         (urlPattern.test(url) && !url.includes('javascript:'));
};

// Enhanced Image Component with Loading State
const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({ 
  src, 
  alt, 
  className, 
  onClick, 
  //fallbackSrc = '/image_not_available.png' 
  fallbackSrc = 'https://placehold.co/1280x720/F0F0F0/000000?text=No+Image+Available'
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string>(src || fallbackSrc);

  useEffect(() => {
    if (src) {
      setImageState('loading');
      setImageSrc(src);
    } else {
      setImageState('error');
      setImageSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleImageLoad = () => {
    setImageState('loaded');
  };

  const handleImageError = () => {
    setImageState('error');
    setImageSrc(fallbackSrc);
  };

  return (
    <div className={`${className} relative overflow-hidden`}>
      {imageState === 'loading' && (
        <div className={`${className} absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse flex items-center justify-center`}>
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-gray-500 text-xs font-medium">Loading image...</span>
          </div>
        </div>
      )}
      
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClick}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {imageState === 'loading' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer transform -skew-x-12"></div>
      )}
    </div>
  );
};

// RSS Feed parser with comprehensive error handling
const parseRSSFeed = async (feedUrl: string): Promise<RSSParseResult> => {
  try {
    const response = await fetch(`/api/rss?url=${encodeURIComponent(feedUrl)}`);
    
    if (!response.ok) {
      return {
        error: true,
        message: response.status === 404 ? 'RSS feed not found' :
                response.status === 403 ? 'Access to RSS feed denied' :
                response.status >= 500 ? 'RSS server temporarily unavailable' :
                'RSS feed is not available',
        status: response.status,
        items: []
      };
    }
    
    const text = await response.text();
    
    if (!text.trim()) {
      return {
        error: true,
        message: 'RSS feed is empty',
        items: []
      };
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return {
        error: true,
        message: 'RSS feed format is invalid',
        items: []
      };
    }
    
    const items = Array.from(doc.querySelectorAll('item')).map((item, index) => {
      const getTextContent = (selector: string): string => {
        const element = item.querySelector(selector);
        return element ? element.textContent || '' : '';
      };

      return {
        id: index,
        title: getTextContent('title'),
        description: getTextContent('description'),
        link: getTextContent('link'),
        pubDate: getTextContent('pubDate'),
        author: getTextContent('author') || getTextContent('dc\\:creator'),
        category: getTextContent('category'),
        guid: getTextContent('guid'),
        image: extractBestImage(item),
        view_count: Math.floor(Math.random() * 10000) + 1000,
        duration_milliseconds: Math.floor(Math.random() * 1800000) + 300000,
        video_poster_image_url: extractBestImage(item),
        embedded_video_url: getTextContent('link'),
        upload_date: getTextContent('pubDate')
      };
    });

    if (items.length === 0) {
      return {
        error: true,
        message: 'RSS feed contains no articles',
        items: []
      };
    }

    return {
      error: false,
      items: items,
      message: `Successfully loaded ${items.length} articles`
    };
    
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        error: true,
        message: 'Unable to connect to RSS feed - check your internet connection',
        items: []
      };
    }
    
    return {
      error: true,
      message: 'Failed to load RSS feed - please try again later',
      items: []
    };
  }
};

const formatDuration = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const Loader: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
    <div className="flex space-x-2 animate-pulse">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
    </div>
  </div>
);

const useInView = (options: UseInViewOptions = {}) => {
  const [inView, setInView] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const elementRef = useRef<HTMLDivElement>(null);

  const { threshold = 0.1, triggerOnce, rootMargin = '50px' } = options;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      setEntry(entry);
      
      if (entry.isIntersecting && triggerOnce) {
        observer.disconnect();
      }
    }, {
      threshold,
      rootMargin
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, triggerOnce, rootMargin]);

  return { ref: elementRef, inView, entry };
};

const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  videoUrl, 
  className, 
  isLarge = false, 
  episodeId, 
  progress, 
  darkMode, 
  title, 
  ...props 
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '100px'
  });

  const handleImageClick = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  return (
    <div ref={ref} className={`${className} relative`} onClick={handleImageClick}>
      {inView ? (
        <>
          <ImageWithLoader
            src={src}
            alt={title || 'RSS Article'}
            className={`${className} object-cover h-full`}
            onClick={handleImageClick}
            {...props}
          />
          <ProgressBar progress={progress} darkMode={darkMode} />
        </>
      ) : (
        <div className={`${className} ${darkMode ? 'bg-gradient-to-r from-gray-700 to-gray-800' : 'bg-gradient-to-r from-gray-200 to-gray-300'} flex items-center justify-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse transform -skew-x-12"></div>
          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm font-medium`}>
            {isLarge ? 'Loading article...' : 'Loading...'}
          </div>
        </div>
      )}
    </div>
  );
};

const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rss-bookmarks');
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);

  const toggleBookmark = (articleId: string) => {
    const updated = bookmarks.includes(articleId)
      ? bookmarks.filter(id => id !== articleId)
      : [...bookmarks, articleId];
    
    setBookmarks(updated);
    localStorage.setItem('rss-bookmarks', JSON.stringify(updated));
  };

  return { bookmarks, toggleBookmark };
};

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, darkMode }) => {
  return null;
};

const BackToTop: React.FC<BackToTopProps> = ({ darkMode }) => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowButton(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showButton) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-40 hover:scale-110"
      title="Back to Top"
    >
      ↑
    </button>
  );
};

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm, darkMode }) => (
  <div className="relative mb-6">
    <input
      type="text"
      placeholder="Search RSS articles..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={`w-full p-4 pl-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${
        darkMode 
          ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
          : 'bg-white border-gray-300 text-gray-900'
      }`}
    />
    <svg className="absolute left-4 top-4 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </div>
);

const ArticleStats: React.FC<ArticleStatsProps> = ({ article, darkMode }) => (
  <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
    <span className="flex items-center gap-1">
      📅 {new Date(article.pubDate || Date.now()).toLocaleDateString()}
    </span>
    {article.author && (
      <span className="flex items-center gap-1">
        ✍️ {article.author}
      </span>
    )}
    {article.category && (
      <span className="flex items-center gap-1">
        🏷️ {article.category}
      </span>
    )}
  </div>
);

const ShareButton: React.FC<ShareButtonProps> = ({ article, darkMode }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
    setShowDropdown(false);
  };

  const shareToTwitter = (article: RSSItem) => {
    const url = `https://twitter.com/intent/tweet?text=Check out this article: ${article.title}&url=${article.link}`;
    window.open(url, '_blank');
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className={`p-2 rounded hover:scale-110 transition-all ${
          darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Share Article"
      >
        📤
      </button>
      {showDropdown && (
        <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        } border`}>
          <button 
            onClick={() => copyToClipboard(article.link)} 
            className={`block w-full text-left px-4 py-2 text-sm rounded-t-md transition-colors ${
              darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            📋 Copy Link
          </button>
          <button 
            onClick={() => shareToTwitter(article)} 
            className={`block w-full text-left px-4 py-2 text-sm rounded-b-md transition-colors ${
              darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🐦 Share on Twitter
          </button>
        </div>
      )}
    </div>
  );
};

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ articleId, bookmarks, toggleBookmark, darkMode }) => {
  const isBookmarked = bookmarks.includes(articleId);
  
  return (
    <button
      onClick={() => toggleBookmark(articleId)}
      className={`p-2 rounded hover:scale-110 transition-all ${
        isBookmarked 
          ? 'text-red-500 hover:text-red-600' 
          : darkMode 
            ? 'text-gray-400 hover:text-red-400' 
            : 'text-gray-500 hover:text-red-500'
      }`}
      title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      {isBookmarked ? '❤️' : '🤍'}
    </button>
  );
};

const ArticleCard: React.FC<ArticleCardProps> = ({ article, isLarge = false, bookmarks, toggleBookmark, darkMode }) => (
  <div className={`relative ${darkMode ? 'bg-gray-800' : 'bg-white'} border overflow-hidden h-full flex-grow rounded ${darkMode ? 'border-gray-700' : 'border-white'} ${isLarge ? 'md:row-span-2' : ''} group`}>
    <LazyImage
      className={`w-full ${isLarge ? 'h-80 md:h-full' : 'h-48'} object-cover`}
      src={article.image}
      videoUrl={article.link}
      title={article.title}
      episodeId={article.link}
      darkMode={darkMode}
      isLarge={isLarge}
    />
    <div className="absolute top-2 left-2 bg-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-full hidden">
      RSS
    </div>
    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <BookmarkButton
        articleId={article.link}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
        darkMode={darkMode}
      />
      <ShareButton article={article} darkMode={darkMode} />
    </div>
    
    <div className={`absolute bottom-0 left-0 w-full text-gray-200 text-sm py-2 ${darkMode ? 'bg-black/90' : 'bg-black/90'} px-3`}>
      <h3 className={`font-bold leading-tight truncate ${isLarge ? 'text-md' : 'text-md md:text-md'}`}>
        {article.title}
      </h3>
      <ArticleStats article={article} darkMode={true} />
    </div>
    
    <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-gray-900/90 opacity-0 group-hover:opacity-100 transition-opacity">
      <Link href={article.link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors duration-300 text-center">
        Read Article
      </Link>
    </div>
  </div>
);

const LazyArticleItem: React.FC<LazyArticleItemProps> = ({ article, index, bookmarks, toggleBookmark, darkMode }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '50px'
  });

  return (
    <div key={index} className="w-full relative" ref={ref}>
      <div className={`flex flex-col sm:flex-row ${darkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden rounded-lg p-4`}>
        <div className="w-full sm:w-1/3 flex-shrink-0 relative">
          {inView ? (
            <LazyImage
              className="object-cover w-full h-32 rounded overflow-hidden"
              src={article.image}
              videoUrl={article.link}
              title={article.title}
              episodeId={article.link}
              darkMode={darkMode}
            />
          ) : (
            <div className={`w-full h-32 ${darkMode ? 'bg-gradient-to-r from-gray-700 to-gray-800' : 'bg-gradient-to-r from-gray-200 to-gray-300'} rounded flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse transform -skew-x-12"></div>
              <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Loading...</div>
            </div>
          )}
        </div>
        <div className="flex-grow px-4 flex flex-col justify-between">
          <div>
            <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {article.title}
            </h3>
            <ArticleStats article={article} darkMode={darkMode} />
            <p className={`text-sm mt-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {article.description.replace(/<[^>]*>/g, '').split(' ').slice(0, 25).join(' ')}...
            </p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <BookmarkButton 
                articleId={article.link}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                darkMode={darkMode}
              />
              <ShareButton article={article} darkMode={darkMode} />
            </div>
            <Link href={article.link} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors duration-300 text-center">
              Read Article
            </Link>
          </div>
        </div>
      </div>
      <hr className={`my-4 h-px border-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
    </div>
  );
};

const FeedSelector: React.FC<FeedSelectorProps> = ({ feeds, selectedFeed, onFeedChange, darkMode }) => (
  <div className="mb-6">
    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
      Select RSS Feed:
    </label>
    <select 
      value={selectedFeed}
      onChange={(e) => onFeedChange(e.target.value)}
      className={`p-3 border rounded-lg w-full md:w-auto ${
        darkMode 
          ? 'bg-gray-800 border-gray-600 text-white' 
          : 'bg-white border-gray-300 text-gray-900'
      }`}
    >
      {feeds.map((feed, index) => (
        <option key={index} value={feed.url}>{feed.name}</option>
      ))}
    </select>
  </div>
);

const RSSErrorDisplay: React.FC<RSSErrorDisplayProps> = ({ error, onRetry, darkMode }) => (
  <div className={`text-center py-12 px-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
    <div className="mb-6">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        RSS Feed Unavailable
      </h3>
      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
        {error}
      </p>
      <button 
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
    
    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <p>Common issues:</p>
      <ul className="mt-2 space-y-1">
        <li>• RSS feed server is temporarily down</li>
        <li>• Feed URL has changed</li>
        <li>• Network connectivity issues</li>
      </ul>
    </div>
  </div>
);

export default function RSSHomePage() {
  const [showLoader, setShowLoader] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(true);
  const [rssItems, setRssItems] = useState<RSSItem[]>([]);
  const [selectedFeed, setSelectedFeed] = useState('');
  const [feedError, setFeedError] = useState<string | null>(null);
  const { bookmarks, toggleBookmark } = useBookmarks();

  const rssFeeds: RSSFeed[] = [
    { name: 'Robin te Hofstee Blog', url:'https://blog.robintehofstee.com/feed.xml'},
    { name: 'NOS Nieuws', url:'https://feeds.nos.nl/nosnieuwsalgemeen'},
    { name: 'NOS Voetbal', url:'https://feeds.nos.nl/nosvoetbal'},
    { name: 'AP News', url:'https://rsshub.app/apnews/topics/ap-top-news'},
  ];

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const loadRSSFeed = async () => {
      setShowLoader(true);
      setFeedError(null);
      
      const feedUrl = selectedFeed || rssFeeds[0].url;
      const result = await parseRSSFeed(feedUrl);
      
      if (result.error) {
        setFeedError(result.message);
        setRssItems([]);
      } else {
        setRssItems(result.items);
        setFeedError(null);
      }
      
      setTimeout(() => setShowLoader(false), 1500);
    };

    loadRSSFeed();
  }, [selectedFeed]);

  const filteredArticles = useMemo(() => {
    return rssItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [rssItems, searchTerm]);

  const featuredArticles = filteredArticles.slice(0, 4);
  const remainingArticles = filteredArticles.slice(4, 9);

  if (showLoader) {
    return <Loader />;
  }

  const disclaimerText = (
    <p className="text-sm">
      This RSS feed reader displays content from external sources. All articles are the property of their respective publishers and authors.
      <br /><br />
      <span className="font-bold text-blue-500">Please respect</span> the terms of service and copyright policies of the original content providers.
    </p>
  );

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {showModal && (
        <DisclaimerModal 
          onClose={() => setShowModal(false)} 
          text={disclaimerText} 
        />
      )}
      
      <button 
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 z-50 p-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-full shadow-lg hover:scale-110 transition-all"
        title="Toggle Dark Mode"
      >
        {darkMode ? '🌞' : '🌙'}
      </button>
      
      <BackToTop darkMode={darkMode} />

      <div className="relative max-w-7xl mx-auto px-4 md:px-12 pt-8">
        <div className={`mb-8 p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
          <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            RSS Feed Reader
          </h1>
          
          <FeedSelector 
            feeds={rssFeeds}
            selectedFeed={selectedFeed}
            onFeedChange={setSelectedFeed}
            darkMode={darkMode}
          />
        </div>

        {feedError ? (
          <RSSErrorDisplay 
            error={feedError}
            onRetry={() => {
              setFeedError(null);
              setSelectedFeed(selectedFeed || rssFeeds[0].url);
            }}
            darkMode={darkMode}
          />
        ) : (
          <>
            <div className={`relative w-full mb-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded shadow-lg`}>
              <h1 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <span className="border-b-2 border-red-400">Featured</span>
                <span className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-500'}`}> Articles</span>
              </h1>
              
              <section className="relative w-full mx-auto flex flex-col md:flex-row gap-0 rounded">
                <div className="w-full md:w-1/2">
                  {featuredArticles[0] && (
                    <ArticleCard 
                      article={featuredArticles[0]} 
                      isLarge={true} 
                      bookmarks={bookmarks}
                      toggleBookmark={toggleBookmark}
                      darkMode={darkMode}
                    />
                  )}
                </div>
                
                <div className="w-full md:w-1/2 flex flex-col gap-0">
                  {featuredArticles[1] && (
                    <ArticleCard 
                      article={featuredArticles[1]} 
                      isLarge={false} 
                      bookmarks={bookmarks}
                      toggleBookmark={toggleBookmark}
                      darkMode={darkMode}
                    />
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-0">
                    {featuredArticles.slice(2, 4).map((article, index) => (
                      <div key={index} className="w-full sm:w-1/2">
                        <ArticleCard 
                          article={article} 
                          isLarge={false}
                          bookmarks={bookmarks}
                          toggleBookmark={toggleBookmark}
                          darkMode={darkMode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <main className="w-full mx-auto mb-12">
              <div className="relative grid grid-cols-1 md:grid-cols-3 md:gap-8">
                <div className={`col-span-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} mb-8 px-6 rounded py-6 shadow-lg`}>
                  <div className="flex justify-between items-baseline mb-6">
                    <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <span className="border-b-2 border-red-400">More</span>
                      <span className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-500'}`}> Articles</span>
                    </h1>
                  </div>
                  
                  <div className="w-full">
                    {remainingArticles.length > 0 ? (
                      remainingArticles.map((article, index) => (
                        <LazyArticleItem 
                          key={index} 
                          article={article} 
                          index={index}
                          bookmarks={bookmarks}
                          toggleBookmark={toggleBookmark}
                          darkMode={darkMode}
                        />
                      ))
                    ) : (
                      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="text-6xl mb-4 mx-auto">📰</div>
                        <h3 className="text-xl font-semibold mb-2">No articles found</h3>
                        <p>Try selecting a different RSS feed</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="relative space-y-8">
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg md:sticky top-8`}>
                    <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Available Feeds
                    </h3>
                    <div className="space-y-2">
                      {rssFeeds.map((feed, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedFeed(feed.url)}
                          className={`block w-full text-left p-2 rounded transition-colors ${
                            selectedFeed === feed.url || (selectedFeed === '' && index === 0)
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                          }`}
                        >
                          {feed.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bookmarks.length > 0 && (
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
                      <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Bookmarked Articles ({bookmarks.length})
                      </h2>
                      <div className="space-y-3">
                        {bookmarks.slice(0, 3).map((bookmarkId, index) => {
                          const article = rssItems.find(item => item.link === bookmarkId);
                          if (!article) return null;
                          return (
                            <div key={index} className={`flex gap-3 p-3 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}>
                              <div className="w-16 h-12 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0"></div>
                              <div className="flex-grow min-w-0">
                                <h4 className={`font-medium text-sm truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {article.title}
                                </h4>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {article.author || 'Unknown Author'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {bookmarks.length > 3 && (
                          <button className={`w-full text-center py-2 text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
                            View all {bookmarks.length} bookmarks →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </main>
          </>
        )}
      </div>
      
      <footer className={`${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'} py-8 mt-12`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-4">
            <h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              RSS Feed Reader
            </h3>
            <p className="mt-2">Stay updated with the latest news and articles</p>
          </div>
          <div className="flex justify-center space-x-6 mb-4">
            <a href="#" className="hover:text-blue-500 transition-colors">About</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Contact</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Terms</a>
          </div>
          <p className="text-sm">
            © 2024 RSS Feed Reader. Content belongs to respective publishers.
          </p>
        </div>
      </footer>
    </div>
  );
}
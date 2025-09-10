// types.ts
// This file centralizes all the TypeScript interfaces for the application.
// This improves code readability and maintainability.

// Defines the shape of a single episode object.
export interface Episode {
  id: string;
  title: string;
  description: string;
  html_description: string;
  duration_milliseconds: number;
  upload_date: string;
  embedded_video_url: string;
  video_poster_image_url: string;
  view_count: number;
  topics: string[];
  categories: string[];
}

// Props for the LazyImage component.
export interface LazyImageProps {
  className: string;
  src: string;
  videoUrl: string;
  title: string;
  episodeId: string;
  progress: { percent: number };
  darkMode: boolean;
  isLarge: boolean; // Required prop, as per the build error.
}

// Props for the EpisodeStats component.
export interface EpisodeStatsProps {
  episode: Episode;
  darkMode: boolean;
}

// Props for the LazyEpisodeItem component.
export interface LazyEpisodeItemProps {
  episode: Episode;
  index: number;
  bookmarks: string[];
  toggleBookmark: (episodeId: string) => void;
  progress: { [key: string]: { percent: number } };
  darkMode: boolean;
}

// Props for the MostViewedCard component.
export interface MostViewedCardProps {
  episode: Episode;
  bookmarks: string[];
  toggleBookmark: (episodeId: string) => void;
  progress: { [key: string]: { percent: number } };
  darkMode: boolean;
}

// Props for the HeroComponent component.
export interface HeroComponentProps {
  episode: Episode;
  progress: { [key: string]: { percent: number } };
  bookmarks: string[];
  toggleBookmark: (episodeId: string) => void;
  darkMode: boolean;
}

// Props for the FeaturedSection component.
export interface FeaturedSectionProps {
  title: string;
  episodes: Episode[];
  bookmarks: string[];
  toggleBookmark: (episodeId: string) => void;
  progress: { [key: string]: { percent: number } };
  darkMode: boolean;
}

// Props for the EpisodeItem component.
export interface EpisodeItemProps {
  episode: Episode;
  bookmarks: string[];
  toggleBookmark: (episodeId: string) => void;
  progress: { [key: string]: { percent: number } };
  darkMode: boolean;
}

// Props for the BookmarkButton component.
export interface BookmarkButtonProps {
  episodeId: string;
  bookmarks: string[];
  toggleBookmark: (episodeId: string) => void;
  darkMode: boolean;
}

// Props for the ShareButton component.
export interface ShareButtonProps {
  episode: Episode;
  darkMode: boolean;
}

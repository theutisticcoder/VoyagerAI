
export interface StoryChapter {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  speedAtCreation: number;
  distanceAtCreation: number;
  audioData?: string; // base64 pcm
  genre: string;
}

export interface SessionState {
  id: string;
  startTime: number;
  chapters: StoryChapter[];
  totalDistance: number;
  totalTime: number;
  genre: string;
  customPlot?: string;
  carpoolMode: boolean;
  isCompleted: boolean;
}

export interface UserMetrics {
  currentSpeed: number; // mph
  totalDistance: number; // miles
  co2Saved: number; // kg
  elapsedTime: number; // seconds
}

export enum Genre {
  CYBERPUNK = 'Cyberpunk',
  NOIR = 'Noir',
  FANTASY = 'Fantasy',
  SCI_FI = 'Sci-Fi',
  GOTHIC = 'Gothic',
  STEAMPUNK = 'Steampunk',
  HORROR = 'Horror',
  THRILLER = 'Thriller',
  ADVENTURE = 'Adventure',
  MYSTERY = 'Mystery',
  MYTHICAL = 'Mythical',
  WESTERN = 'Western',
  SAMURAI = 'Samurai',
  POST_APOCALYPTIC = 'Post-Apocalyptic',
  SPACE_OPERA = 'Space Opera',
  LOVECRAFTIAN = 'Lovecraftian',
  SUPERHERO = 'Superhero',
  FAIRY_TALE = 'Fairy Tale',
  PIRATE = 'Pirate',
  HISTORICAL = 'Historical'
}

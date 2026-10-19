export type Board = {
  id: string;
  question: string;
  duty_name: string;
  announcement: string | null;
  created_at: string;
  archived_at: string | null;
  is_active: boolean;
};

export type Word = {
  id: string;
  board_id: string;
  normalized_text: string;
  display_text: string;
  count: number;
  updated_at: string;
};

export type BoardPayload = {
  board: Board | null;
  words: Word[];
};

export type Archive = {
  id: string;
  question: string;
  duty_name: string;
  created_at: string;
  archived_at: string | null;
  is_active: boolean;
  words: Word[];
};

export type AnnouncementLevel = "info" | "alert";

export type Announcement = {
  id: string;
  message: string;
  level: AnnouncementLevel;
  link_url?: string | null;
  link_label?: string | null;
  created_at: string;
};

export const MAX_MESSAGE = 280;

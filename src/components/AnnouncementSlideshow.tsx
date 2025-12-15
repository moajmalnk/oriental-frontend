import React, { useState, useEffect } from "react";
import { announcementAPI } from "@/services/api";
import { Announcement } from "@/types";

const AnnouncementSlideshow: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active announcements
  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await announcementAPI.getActiveAnnouncements();
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Auto-rotate slideshow
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [announcements.length]);

  // Don't render if loading or no announcements
  if (isLoading || announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <span className="text-xs sm:text-base font-semibold text-emerald-100 tracking-wide">
      {currentAnnouncement.message}
    </span>
  );
};

export default AnnouncementSlideshow;

// Shared context-menu action builders for listing + creator cards.
// Actions: Save, Share, Report, Hide.
//
// Hide on listings removes from the in-memory store (removeListing).
// Hide on creators adds to hiddenCreators in the store; home + search tabs
// filter that set before rendering.
//
// The ContextMenu wrapper already fires haptics.heavy() on long-press start,
// so no extra haptic call is needed here.
import React, { useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import {
  Bookmark,
  BookmarkCheck,
  Share2,
  Flag,
  EyeOff,
  UserPlus,
  UserMinus,
} from 'lucide-react-native';
import type { ContextMenuAction } from '../components/ui/ContextMenu';
import { useStore } from '../lib/store';
import { toast } from '../lib/toast';
import type { Listing, Creator } from '../types';

const ICON_SIZE = 18;

// ─── Listing context actions ──────────────────────────────────────────────────

export function useListingContextActions(listing: Listing): ContextMenuAction[] {
  const savedListings = useStore((s) => s.savedListings);
  const toggleSavedListing = useStore((s) => s.toggleSavedListing);
  const removeListing = useStore((s) => s.removeListing);
  const isSaved = savedListings.includes(listing.id);

  const handleSave = useCallback(() => {
    toggleSavedListing(listing.id);
    toast.success(isSaved ? 'Removed from saved' : 'Listing saved');
  }, [listing.id, isSaved, toggleSavedListing]);

  const handleShare = useCallback(() => {
    Share.share({
      title: listing.title,
      message: `Check out "${listing.title}" by ${listing.business.business_name} on Surve`,
    }).catch(() => {});
  }, [listing]);

  const handleReport = useCallback(() => {
    toast.info('Thanks — our team will review this listing.');
  }, []);

  const handleHide = useCallback(() => {
    removeListing(listing.id);
    toast.success('Listing hidden');
  }, [listing.id, removeListing]);

  return useMemo<ContextMenuAction[]>(
    () => [
      {
        key: 'save',
        label: isSaved ? 'Unsave' : 'Save',
        icon: isSaved
          ? <BookmarkCheck size={ICON_SIZE} />
          : <Bookmark size={ICON_SIZE} />,
        onPress: handleSave,
      },
      {
        key: 'share',
        label: 'Share',
        icon: <Share2 size={ICON_SIZE} />,
        onPress: handleShare,
      },
      {
        key: 'report',
        label: 'Report',
        icon: <Flag size={ICON_SIZE} />,
        onPress: handleReport,
      },
      {
        key: 'hide',
        label: 'Hide',
        icon: <EyeOff size={ICON_SIZE} />,
        onPress: handleHide,
      },
    ],
    [isSaved, handleSave, handleShare, handleReport, handleHide]
  );
}

// ─── Creator context actions ──────────────────────────────────────────────────

export function useCreatorContextActions(creator: Creator): ContextMenuAction[] {
  const followedCreators = useStore((s) => s.followedCreators);
  const toggleFollowedCreator = useStore((s) => s.toggleFollowedCreator);
  const hideCreator = useStore((s) => s.hideCreator);
  const isFollowed = followedCreators.includes(creator.id);

  const handleSave = useCallback(() => {
    toggleFollowedCreator(creator.id);
    toast.success(isFollowed ? 'Unfollowed' : 'Now following');
  }, [creator.id, isFollowed, toggleFollowedCreator]);

  const handleShare = useCallback(() => {
    Share.share({
      title: creator.user.full_name,
      message: `Check out ${creator.user.full_name}'s creator profile on Surve`,
    }).catch(() => {});
  }, [creator]);

  const handleReport = useCallback(() => {
    toast.info('Thanks — our team will review this profile.');
  }, []);

  const handleHide = useCallback(() => {
    hideCreator(creator.id);
    toast.success('Creator hidden');
  }, [creator.id, hideCreator]);

  return useMemo<ContextMenuAction[]>(
    () => [
      {
        key: 'save',
        label: isFollowed ? 'Unfollow' : 'Follow',
        icon: isFollowed
          ? <UserMinus size={ICON_SIZE} />
          : <UserPlus size={ICON_SIZE} />,
        onPress: handleSave,
      },
      {
        key: 'share',
        label: 'Share',
        icon: <Share2 size={ICON_SIZE} />,
        onPress: handleShare,
      },
      {
        key: 'report',
        label: 'Report',
        icon: <Flag size={ICON_SIZE} />,
        onPress: handleReport,
      },
      {
        key: 'hide',
        label: 'Hide',
        icon: <EyeOff size={ICON_SIZE} />,
        onPress: handleHide,
      },
    ],
    [isFollowed, handleSave, handleShare, handleReport, handleHide]
  );
}

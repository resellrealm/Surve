// Shared context-menu action builders for listing + creator cards.
// Keeps ListingCard / CreatorCard wiring thin and consistent.
import { useCallback, useMemo } from 'react';
import { Share } from 'react-native';
import { Bookmark, BookmarkMinus, Share2, Flag, UserX } from 'lucide-react-native';
import type { ContextMenuAction } from '../components/ui/ContextMenu';
import { useStore } from '../lib/store';
import { toast } from '../lib/toast';
import * as api from '../lib/api';
import type { Listing, Creator } from '../types';

export function useListingContextActions(
  listing: Listing
): ContextMenuAction[] {
  const savedListings = useStore((s) => s.savedListings);
  const toggleSavedListing = useStore((s) => s.toggleSavedListing);
  const user = useStore((s) => s.user);
  const isSaved = savedListings.includes(listing.id);

  const share = useCallback(() => {
    Share.share({
      title: listing.title,
      message: `${listing.title} — on Surve\nhttps://surve.app/listing/${listing.id}`,
      url: `https://surve.app/listing/${listing.id}`,
    }).catch(() => {});
  }, [listing]);

  const report = useCallback(async () => {
    if (!user) return;
    const ok = await api.reportUser(
      user.id,
      listing.business.user_id,
      'inappropriate_listing',
      `Listing: ${listing.id}`
    );
    if (ok) {
      toast.success('Thanks — our team will review this listing.');
    } else {
      toast.error('Could not submit report. Please try again.');
    }
  }, [listing, user]);

  const block = useCallback(async () => {
    if (!user) return;
    const ok = await api.blockUser(user.id, listing.business.user_id);
    if (ok) {
      toast.success(`Blocked ${listing.business.business_name}`);
    } else {
      toast.error('Could not block. Please try again.');
    }
  }, [listing, user]);

  return useMemo<ContextMenuAction[]>(
    () => [
      {
        key: 'save',
        label: isSaved ? 'Remove from saved' : 'Save',
        icon: isSaved ? <BookmarkMinus size={18} /> : <Bookmark size={18} />,
        onPress: () => toggleSavedListing(listing.id),
      },
      {
        key: 'share',
        label: 'Share',
        icon: <Share2 size={18} />,
        onPress: share,
      },
      {
        key: 'report',
        label: 'Report',
        icon: <Flag size={18} />,
        onPress: report,
      },
      {
        key: 'block',
        label: `Block ${listing.business.business_name}`,
        icon: <UserX size={18} />,
        destructive: true,
        onPress: block,
      },
    ],
    [isSaved, listing, share, report, block, toggleSavedListing]
  );
}

export function useCreatorContextActions(
  creator: Creator
): ContextMenuAction[] {
  const followedCreators = useStore((s) => s.followedCreators);
  const toggleFollowedCreator = useStore((s) => s.toggleFollowedCreator);
  const user = useStore((s) => s.user);
  const isFollowed = followedCreators.includes(creator.id);

  const share = useCallback(() => {
    Share.share({
      title: creator.user.full_name,
      message: `${creator.user.full_name} on Surve — https://surve.app/creator/${creator.id}`,
      url: `https://surve.app/creator/${creator.id}`,
    }).catch(() => {});
  }, [creator]);

  const report = useCallback(async () => {
    if (!user) return;
    const ok = await api.reportUser(
      user.id,
      creator.user.id,
      'inappropriate_profile',
      `Creator: ${creator.id}`
    );
    if (ok) {
      toast.success('Thanks — our team will review this creator.');
    } else {
      toast.error('Could not submit report. Please try again.');
    }
  }, [creator, user]);

  const block = useCallback(async () => {
    if (!user) return;
    const ok = await api.blockUser(user.id, creator.user.id);
    if (ok) {
      toast.success(`Blocked ${creator.user.full_name}`);
    } else {
      toast.error('Could not block. Please try again.');
    }
  }, [creator, user]);

  return useMemo<ContextMenuAction[]>(
    () => [
      {
        key: 'save',
        label: isFollowed ? 'Unfollow' : 'Save (follow)',
        icon: isFollowed ? <BookmarkMinus size={18} /> : <Bookmark size={18} />,
        onPress: () => toggleFollowedCreator(creator.id),
      },
      {
        key: 'share',
        label: 'Share',
        icon: <Share2 size={18} />,
        onPress: share,
      },
      {
        key: 'report',
        label: 'Report',
        icon: <Flag size={18} />,
        onPress: report,
      },
      {
        key: 'block',
        label: `Block ${creator.user.full_name}`,
        icon: <UserX size={18} />,
        destructive: true,
        onPress: block,
      },
    ],
    [isFollowed, creator, share, report, block, toggleFollowedCreator]
  );
}

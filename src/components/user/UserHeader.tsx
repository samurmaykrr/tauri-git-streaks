/**
 * # UserHeader Component
 *
 * Displays the GitHub user's avatar, name, and profile link.
 *
 * ## Visual Layout
 *
 * ```
 * ┌───────────────────────────────────────────────┐
 * │                                               │
 * │   ┌──────────┐                                │
 * │   │          │   username                     │
 * │   │  Avatar  │   @username  ◄── Link to       │
 * │   │   40x40  │              GitHub profile    │
 * │   └──────────┘                                │
 * │                                               │
 * └───────────────────────────────────────────────┘
 * ```
 *
 * ## Avatar Details
 *
 * ```
 * ┌────────────────────┐
 * │                    │
 * │    GitHub Avatar   │  Size: 40x40 pixels
 * │    (from API)      │  Shape: Circular (rounded-full)
 * │                    │  Border: 1px var(--border-muted)
 * │                    │
 * └────────────────────┘
 *
 * Avatar URL Format:
 * https://avatars.githubusercontent.com/u/{user_id}?v=4
 * ```
 *
 * ## Link Behavior
 *
 * ```
 * @username click
 *      │
 *      ▼
 * ┌────────────────────────────────────┐
 * │  Opens in external browser         │
 * │  (target="_blank")                 │
 * │                                    │
 * │  Security:                         │
 * │  - rel="noopener noreferrer"       │
 * │  - Prevents window.opener access   │
 * └────────────────────────────────────┘
 * ```
 *
 * @module UserHeader
 */

import type { UserInfo } from "../../lib/types";

/**
 * Props for the UserHeader component.
 */
interface UserHeaderProps {
  /** User information including username and avatar URL */
  user: UserInfo;
}

/**
 * User header component displaying GitHub identity.
 *
 * Shows the user's GitHub avatar, display name, and a
 * clickable link to their GitHub profile.
 *
 * ## Features
 *
 * - **Circular Avatar**: 40x40 pixel rounded image
 * - **Display Name**: User's GitHub username
 * - **Profile Link**: Opens GitHub profile in new tab
 * - **External Link Safety**: Uses noopener/noreferrer
 *
 * @param props - Component props with user info
 * @returns Rendered user header
 *
 * @example
 * ```tsx
 * <UserHeader
 *   user={{
 *     username: "octocat",
 *     avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4"
 *   }}
 * />
 * ```
 */
export function UserHeader({ user }: UserHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      {/* GitHub avatar image */}
      <img
        src={user.avatarUrl}
        alt={`${user.username}'s avatar`}
        className="w-10 h-10 rounded-full"
        style={{ border: "1px solid var(--border-muted)" }}
      />

      {/* Username and profile link */}
      <div className="flex flex-col">
        {/* Display name */}
        <span
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {user.username}
        </span>

        {/* GitHub profile link - opens in external browser */}
        <a
          href={`https://github.com/${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs transition-colors"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "monospace",
          }}
        >
          @{user.username}
        </a>
      </div>
    </div>
  );
}

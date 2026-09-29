import * as React from "react";
import { cn } from "@/lib/utils";

export interface Profile {
  id: string;
  label: string;
  icon: string | React.ReactNode;
}
interface ProfileSelectorProps {
  title?: string;
  profiles: Profile[];
  onProfileSelect: (id: string) => void;
  className?: string;
  /** Localized action label; the supplied component's English default is retained. */
  selectionLabel?: (profile: Profile) => string;
  selectedId?: string | null;
  disabled?: boolean;
}
/** Supplied ProfileSelector, extended only for localization and selection state. */
export const ProfileSelector = ({
  title = "Who's watching?",
  profiles,
  onProfileSelect,
  className,
  selectionLabel = (profile) => `Select profile: ${profile.label}`,
  selectedId,
  disabled = false,
}: ProfileSelectorProps) => (
  <div
    className={cn(
      "profile-selector flex min-h-screen w-full flex-col items-center justify-center bg-background p-4",
      className,
    )}
  >
    <div className="flex flex-col items-center">
      <h1 className="mb-10 text-3xl font-medium text-foreground md:text-5xl">
        {title}
      </h1>
      <div
        style={
          {
            "--cols-small": Math.max(1, Math.min(profiles.length, 2)),
            "--cols-medium": Math.max(1, Math.min(profiles.length, 3)),
            "--cols-large": Math.max(1, Math.min(profiles.length, 4)),
            "--cols-wide": Math.max(1, Math.min(profiles.length, 5)),
          } as React.CSSProperties
        }
        className="profile-grid grid grid-cols-[repeat(var(--cols-small),minmax(0,1fr))] gap-4 sm:grid-cols-[repeat(var(--cols-medium),minmax(0,1fr))] md:gap-6 lg:grid-cols-[repeat(var(--cols-large),minmax(0,1fr))] xl:grid-cols-[repeat(var(--cols-wide),minmax(0,1fr))]"
      >
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="group flex flex-col items-center gap-3"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onProfileSelect(profile.id)}
              aria-label={selectionLabel(profile)}
              aria-pressed={selectedId === profile.id}
              className="group relative h-28 w-28 rounded-full transition-transform duration-300 ease-in-out hover:-translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-36 md:w-36"
            >
              <div className="absolute inset-0 rounded-full bg-muted transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20" />
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                {typeof profile.icon === "string" ? (
                  <img
                    src={profile.icon}
                    alt={`${profile.label} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profile.icon
                )}
              </div>
            </button>
            <p className="text-lg text-muted-foreground transition-colors group-hover:text-foreground">
              {profile.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
);
export const ProfileIcon = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex h-full w-full items-center justify-center text-4xl text-foreground/80 md:text-5xl",
      className,
    )}
  >
    {children}
  </div>
);

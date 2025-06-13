"use client";
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { bootstrapUserProfile } from './ProfileBootstrapperApiServerActions';

export function ProfileBootstrapper() {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    console.log("ProfileBootstrapper useEffect running", { isLoaded, isSignedIn, userId, user });
    bootstrapUserProfile({ userId, user })
      .catch((err) => {
        console.error("Profile bootstrap failed:", err);
      });
  }, [isLoaded, isSignedIn, userId, user]);
  return null;
}
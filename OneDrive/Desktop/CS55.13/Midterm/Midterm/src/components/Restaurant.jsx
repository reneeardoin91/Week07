"use client";

// This component shows one individual restaurant.
// It receives data from src/app/restaurant/[id]/page.jsx

// Import React state and lifecycle hooks for live restaurant and review state.
import { React, useState, useEffect, Suspense } from "react";
// Load the review dialog only when this client component renders it.
import dynamic from "next/dynamic";
// Import the Firestore listener that keeps restaurant details up to date.
import { getRestaurantSnapshotById } from "@/src/lib/firebase/firestore.js";
// Import the currently authenticated browser user.
import { useUser } from "@/src/lib/getUser";
// Import the component that displays restaurant information and actions.
import RestaurantDetails from "@/src/components/RestaurantDetails.jsx";
// Import the helper that uploads and saves a new restaurant image.
import { updateRestaurantImage } from "@/src/lib/firebase/storage.js";

// Defer loading the review dialog until it is needed in the browser.
const ReviewDialog = dynamic(() => import("@/src/components/ReviewDialog.jsx"));

// Render one restaurant and its interactive review and image features.
export default function Restaurant({
  id,
  initialRestaurant,
  initialUserId,
  children,
}) {
  // Start with the server-provided data while live updates are being attached.
  const [restaurantDetails, setRestaurantDetails] = useState(initialRestaurant);
  // Track whether the review dialog should currently be displayed.
  const [isOpen, setIsOpen] = useState(false);

  // The only reason this component needs to know the user ID is to associate a review with the user, and to know whether to show the review dialog
  // Prefer the live browser user ID, falling back to the ID passed from the server.
  const userId = useUser()?.uid || initialUserId;
  // Store the controlled review fields displayed in the dialog.
  const [review, setReview] = useState({
    rating: 0,
    text: "",
  });

  // Update one review field while preserving the other field's value.
  const onChange = (value, name) => {
    setReview({ ...review, [name]: value });
  };

  // Upload a selected restaurant photo and update local display state.
  async function handleRestaurantImage(target) {
    // Get the first selected file, or null if the selection is empty.
    const image = target.files ? target.files[0] : null;
    if (!image) {
      // Leave the current restaurant image unchanged when no file is selected.
      return;
    }

    // Save the image and get its public URL.
    const imageURL = await updateRestaurantImage(id, image);
    // Display the newly uploaded image immediately.
    setRestaurantDetails({ ...restaurantDetails, photo: imageURL });
  }

  // Close the dialog and clear its controlled review fields.
  const handleClose = () => {
    setIsOpen(false);
    setReview({ rating: 0, text: "" });
  };

  // Subscribe to restaurant updates and return the listener cleanup function.
  useEffect(() => {
    return getRestaurantSnapshotById(id, (data) => {
      // Replace stale restaurant details when Firestore sends an update.
      setRestaurantDetails(data);
    });
    // Reattach the listener if the requested restaurant changes.
  }, [id]);

  // Render restaurant information and show the review form only for signed-in users.
  return (
    <>
      {/* Pass current restaurant data and interactive handlers into the details view. */}
      <RestaurantDetails
        restaurant={restaurantDetails}
        userId={userId}
        handleRestaurantImage={handleRestaurantImage}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
      >
        {children}
      </RestaurantDetails>
      {/* Keep the review feature unavailable when there is no user identity. */}
      {userId && (
        <Suspense fallback={<p>Loading...</p>}>
          {/* Provide a temporary loading state and render the review form. */}
          <ReviewDialog
            isOpen={isOpen}
            handleClose={handleClose}
            review={review}
            onChange={onChange}
            userId={userId}
            id={id}
          />
        </Suspense>
      )}
    </>
  );
}

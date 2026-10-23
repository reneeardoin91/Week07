// Import Firebase Storage helpers for file paths, uploads, and download URLs.
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Import the shared Firebase Storage instance configured for the client.
import { storage } from "@/src/lib/firebase/clientApp";

// Import the Firestore helper that saves the restaurant's image URL.
import { updateRestaurantImageReference } from "@/src/lib/firebase/firestore";

// Upload a restaurant image and save its public download URL in Firestore.
export async function updateRestaurantImage(restaurantId, image) {
  // Validate inputs and log any errors during upload or database update.
  try {
    if (!restaurantId) {
      // Reject uploads that cannot be associated with a restaurant.
      throw new Error("No restaurant ID has been provided.");
    }

    if (!image || !image.name) {
      // Reject missing files and file objects without a name.
      throw new Error("A valid image has not been provided.");
    }

    // Upload the file and retrieve its public URL.
    const publicImageUrl = await uploadImage(restaurantId, image);
    // Store the URL on the corresponding restaurant document.
    await updateRestaurantImageReference(restaurantId, publicImageUrl);

    // Return the URL so the caller can update the displayed image.
    return publicImageUrl;
  } catch (error) {
    // Log processing failures so upload errors are visible during debugging.
    console.error("Error processing request:", error);
  }
}

// Upload an image into the folder assigned to its restaurant.
async function uploadImage(restaurantId, image) {
  // Build a unique storage path from the restaurant ID and original filename.
  const filePath = `images/${restaurantId}/${image.name}`;
  // Create a Firebase Storage reference to the destination path.
  const newImageRef = ref(storage, filePath);
  // Upload the image bytes to Firebase Storage.
  await uploadBytesResumable(newImageRef, image);

  // Return the URL that can be used to display the uploaded image.
  return await getDownloadURL(newImageRef);
}

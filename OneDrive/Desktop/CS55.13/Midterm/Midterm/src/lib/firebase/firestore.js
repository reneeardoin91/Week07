// Import the fake restaurant data generator used to seed sample restaurants and reviews.
import { generateFakeRestaurantsAndReviews } from "@/src/lib/fakeRestaurants.js";

// Import the Firestore APIs required for querying, listening to changes, and writing restaurant data.
import {
  collection,
  onSnapshot,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
  runTransaction,
  where,
  addDoc,
  getFirestore,
} from "firebase/firestore";

// Import the shared Firestore database instance configured for the app.
import { db } from "@/src/lib/firebase/clientApp";

// Update a restaurant document so it stores a new public image URL.
export async function updateRestaurantImageReference(
  restaurantId,
  publicImageUrl
) {
  // Create a reference to the restaurant document by using its collection and ID.
  const restaurantRef = doc(collection(db, "restaurants"), restaurantId);
  // Only update if the reference was created successfully.
  if (restaurantRef) {
    // Save the new image URL in the restaurant's photo field.
    await updateDoc(restaurantRef, { photo: publicImageUrl });
  }
}

// Update the restaurant's aggregate rating and save its individual review.
const updateWithRating = async (
  transaction,
  docRef,
  newRatingDocument,
  review
) => {
  // Read the restaurant data inside the transaction before changing its totals.
  const restaurant = await transaction.get(docRef);
  // Extract the current restaurant fields from the Firestore snapshot.
  const data = restaurant.data();
  // Increase the review count, starting from one for the first rating.
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1;
  // Add this review's numeric rating to the running sum.
  const newSumRating = (data?.sumRating || 0) + Number(review.rating);
  // Recalculate the average from the updated sum and count.
  const newAverage = newSumRating / newNumRatings;

  // Atomically update the restaurant's aggregate rating fields.
  transaction.update(docRef, {
    numRatings: newNumRatings,
    sumRating: newSumRating,
    avgRating: newAverage,
  });

  // Add the individual review with the current Firestore timestamp.
  transaction.set(newRatingDocument, {
    ...review,
    timestamp: Timestamp.fromDate(new Date()),
  });
};

// Add a review while keeping the restaurant's aggregate ratings consistent.
export async function addReviewToRestaurant(db, restaurantId, review) {
  if (!restaurantId) {
    // Refuse to write a review without a restaurant document ID.
    throw new Error("No restaurant ID has been provided.");
  }

  if (!review) {
    // Refuse to write when the review payload is missing.
    throw new Error("A valid review has not been provided.");
  }

  try {
    // Build a reference to the restaurant whose rating totals will be updated.
    const docRef = doc(collection(db, "restaurants"), restaurantId);
    // Reserve a new document reference in the restaurant's ratings collection.
    const newRatingDocument = doc(
      collection(db, `restaurants/${restaurantId}/ratings`),
    );

    // Commit the review and aggregate changes together to keep them consistent.
    await runTransaction(db, (transaction) =>
      updateWithRating(transaction, docRef, newRatingDocument, review),
    );
  } catch (error) {
    // Report the Firestore failure and allow callers to handle it as well.
    console.error(
      "There was an error adding the rating to the restaurant",
      error,
    );
    throw error;
  }
}

// Apply any query filters for category, city, price, and sorting to a Firestore query.
function applyQueryFilters(q, { category, city, price, sort }) {
  // Add a category filter when a category value was provided.
  if (category) {
    // Keep only restaurants matching the requested category.
    q = query(q, where("category", "==", category));
  }
  // Add a city filter when a city value was provided.
  if (city) {
    // Keep only restaurants in the requested city.
    q = query(q, where("city", "==", city));
  }
  // Add a price filter by checking the length of the price string.
  if (price) {
    // Match the numeric price tier represented by the dollar-sign string.
    q = query(q, where("price", "==", price.length));
  }
  // Sort by average rating by default or when the user requests rating sorting.
  if (sort === "Rating" || !sort) {
    // Put the highest-rated restaurants first.
    q = query(q, orderBy("avgRating", "desc"));
  } else if (sort === "Review") {
    // Otherwise, sort by review count when the user requests review sorting.
    // Put restaurants with the most reviews first.
    q = query(q, orderBy("numRatings", "desc"));
  }
  // Return the query with all selected filters applied.
  return q;
}

// Fetch all restaurants that match the provided filters.
export async function getRestaurants(db = db, filters = {}) {
  // Start with a query against the restaurants collection.
  let q = query(collection(db, "restaurants"));

  // Apply any category, city, price, or sort filters.
  q = applyQueryFilters(q, filters);
  // Run the Firestore query and get the matching documents.
  const results = await getDocs(q);
  // Convert every Firestore document into a plain object with an ID and JavaScript Date timestamp.
  return results.docs.map((doc) => {
    // Combine each document ID and its stored restaurant data in the result.
    return {
      id: doc.id,
      ...doc.data(),
      // Convert the Firestore timestamp to a JavaScript Date so it can be passed to client components.
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Create a live listener for restaurants that match the supplied filters.
export function getRestaurantsSnapshot(cb, filters = {}) {
  // Ensure the callback is a function before attaching a listener.
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function");
    return;
  }

  // Start with the restaurant collection query.
  let q = query(collection(db, "restaurants"));
  // Apply any optional filters.
  q = applyQueryFilters(q, filters);

  // Subscribe to snapshot updates for the restaurants query.
  return onSnapshot(q, (querySnapshot) => {
    // Map each matched document into a plain object with a converted timestamp.
    const results = querySnapshot.docs.map((doc) => {
      // Include the Firestore ID alongside each restaurant's data.
      return {
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to JavaScript Date objects before returning data.
        timestamp: doc.data().timestamp.toDate(),
      };
    });

    // Send the latest list to the provided callback.
    cb(results);
  });
}

// Fetch a single restaurant by its Firestore document ID.
export async function getRestaurantById(db, restaurantId) {
  // Reject empty or missing IDs.
  if (!restaurantId) {
    console.log("Error: Invalid ID received: ", restaurantId);
    return;
  }
  // Build a document reference for the target restaurant.
  const docRef = doc(db, "restaurants", restaurantId);
  // Retrieve the restaurant document from Firestore.
  const docSnap = await getDoc(docRef);
  // Return the restaurant data with a real JavaScript Date timestamp.
  // Convert the stored timestamp before returning plain data to the caller.
  return {
    ...docSnap.data(),
    timestamp: docSnap.data().timestamp.toDate(),
  };
}

// Listen for real-time changes to a specific restaurant document.
export function getRestaurantSnapshotById(restaurantId, cb) {
  // Reject empty or missing IDs.
  if (!restaurantId) {
    console.log("Error: Invalid ID received: ", restaurantId);
    return;
  }

  // Ensure the callback is a function before attaching the listener.
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function");
    return;
  }

  // Create the document reference for the target restaurant.
  const docRef = doc(db, "restaurants", restaurantId);
  // Attach a live snapshot listener to the restaurant document.
  return onSnapshot(docRef, (docSnap) => {
    // Send the current fields and a JavaScript Date to the consumer callback.
    cb({
      ...docSnap.data(),
      timestamp: docSnap.data().timestamp.toDate(),
    });
  });
}

// Fetch all reviews for a restaurant ordered by newest to oldest.
export async function getReviewsByRestaurantId(db, restaurantId) {
  // Reject empty or missing restaurant IDs.
  if (!restaurantId) {
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    return;
  }

  // Query the ratings subcollection for this restaurant and sort newest first.
  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"),
    orderBy("timestamp", "desc")
  );

  // Fetch the matching review documents.
  const results = await getDocs(q);
  // Convert each review into a plain object with a Date timestamp.
  return results.docs.map((doc) => {
    // Include each review ID and convert its timestamp for the caller.
    return {
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to JavaScript Date objects before returning them.
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Listen for real-time changes to a restaurant's reviews.
export function getReviewsSnapshotByRestaurantId(restaurantId, cb) {
  // Reject empty or missing restaurant IDs.
  if (!restaurantId) {
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    return;
  }

  // Build the ratings subcollection query ordered by newest review first.
  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"),
    orderBy("timestamp", "desc")
  );
  // Attach a live listener to the review query.
  return onSnapshot(q, (querySnapshot) => {
    // Map each review document into a plain object with a Date timestamp.
    const results = querySnapshot.docs.map((doc) => {
      // Include the review ID and convert the stored timestamp.
      return {
        id: doc.id,
        ...doc.data(),
        // Convert the Firestore review timestamp into a JavaScript Date.
        timestamp: doc.data().timestamp.toDate(),
      };
    });
    // Send the latest reviews to the consumer callback.
    cb(results);
  });
}

// Insert fake restaurant and review data into Firestore for testing or demo purposes.
export async function addFakeRestaurantsAndReviews() {
  // Generate the sample restaurant and rating payloads.
  const data = await generateFakeRestaurantsAndReviews();
  // Loop through every generated restaurant entry.
  for (const { restaurantData, ratingsData } of data) {
    // Keep processing errors for one restaurant visible without hiding the failure.
    try {
      // Add the restaurant document to the restaurants collection.
      const docRef = await addDoc(
        collection(db, "restaurants"),
        restaurantData
      );

      // Add each generated review under the restaurant's ratings subcollection.
      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "restaurants", docRef.id, "ratings"),
          ratingData
        );
      }
    } catch (e) {
      // Log a general error if the document insert fails.
      console.log("There was an error adding the document");
      // Log the original error for debugging and troubleshooting.
      console.error("Error adding document: ", e);
    }
  }
}

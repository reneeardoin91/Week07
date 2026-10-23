// Import the Google AI plugin used to generate the summary.
import { googleAI } from "@genkit-ai/google-genai";
// Import Genkit's function for configuring an AI generation instance.
import { genkit } from "genkit";
// Import the Firestore helper that retrieves a restaurant's reviews.
import { getReviewsByRestaurantId } from "@/src/lib/firebase/firestore.js";
// Import the authenticated server-side Firebase app for the current request.
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// Import the Firestore factory used with the authenticated Firebase app.
import { getFirestore } from "firebase/firestore";

// Fetch restaurant reviews and generate an AI-written one-sentence summary.
export async function GeminiSummary({ restaurantId }) {
  // Get the Firebase app associated with the current authenticated user.
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  // Load the reviews from this restaurant's ratings collection.
  const reviews = await getReviewsByRestaurantId(
    getFirestore(firebaseServerApp),
    restaurantId
  );

  // Use a separator to distinguish individual reviews in the prompt.
  const reviewSeparator = "@";
  // Ask the model to summarize the text of every review in one sentence.
  const prompt = `
    Based on the following restaurant reviews, 
    where each review is separated by a '${reviewSeparator}' character, 
    create a one-sentence summary of what people think of the restaurant. 

    Here are the reviews: ${reviews.map((review) => review.text).join(reviewSeparator)}
  `;

  // Catch missing configuration or generation errors and render a fallback.
  try {
    if (!process.env.GEMINI_API_KEY) {
      // Make sure GEMINI_API_KEY environment variable is set:
      // https://genkit.dev/docs/get-started/
      throw new Error(
        'GEMINI_API_KEY not set. Set it with "firebase apphosting:secrets:set GEMINI_API_KEY"'
      );
    }

    // Configure a Genkit instance.
    const ai = genkit({
      plugins: [googleAI()],
      model: googleAI.model("gemini-2.5-flash"),
    });
    // Generate the summary text from the prepared prompt.
    const { text } = await ai.generate(prompt);

    // Display the generated summary and identify the AI feature.
    return (
      <div className="restaurant__review_summary">
        <p>{text}</p>
        <p>✨ Summarized with Gemini</p>
      </div>
    );
  } catch (e) {
    // Log the failure for diagnosis before showing a user-facing message.
    console.error(e);
    return <p>Error summarizing reviews.</p>;
  }
}

// Render the placeholder shown while the summary is being generated.
export function GeminiSummarySkeleton() {
  // Keep the loading message styled consistently with the final summary.
  return (
    <div className="restaurant__review_summary">
      <p>✨ Summarizing reviews with Gemini...</p>
    </div>
  );
}

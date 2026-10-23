"use client";

// This component uses a Next.js Server Action to submit the review form.

// Import React hooks used to control the native dialog element.
import { useEffect, useLayoutEffect, useRef } from "react";
// Import the star rating inputs shown in the review form.
import RatingPicker from "@/src/components/RatingPicker.jsx";
// Import the server action that saves submitted review form data.
import { handleReviewFormSubmission } from "@/src/app/actions.js";

// Define the dialog and the props supplied by its parent component.
const ReviewDialog = ({
  isOpen,
  handleClose,
  review,
  onChange,
  userId,
  id,
}) => {
  // Keep a reference to the native HTML dialog for opening and closing it.
  const dialog = useRef();

  // dialogs only render their backdrop when called with `showModal`
  // Synchronize the native dialog state whenever the parent toggles visibility.
  useLayoutEffect(() => {
    if (isOpen) {
      // Open the dialog modally so the browser displays its backdrop.
      dialog.current.showModal();
    } else {
      // Close the dialog when the parent marks it as hidden.
      dialog.current.close();
    }
    // Re-run when visibility changes or the dialog reference is replaced.
  }, [isOpen, dialog]);

  // Handle a mouse press on the dialog surface.
  const handleClick = (e) => {
    // close if clicked outside the modal
    if (e.target === dialog.current) {
      // Notify the parent when the click lands on the backdrop itself.
      handleClose();
    }
  };

  // Render the review form inside a native accessible dialog.
  return (
    // Connect the dialog element to its ref and backdrop click handler.
    <dialog ref={dialog} onMouseDown={handleClick}>
      {/* Submit form fields to the server action and close when submission starts. */}
      <form
        action={handleReviewFormSubmission}
        onSubmit={() => {
          handleClose();
        }}
      >
        {/* Identify the purpose of this form to the user. */}
        <header>
          <h3>Add your review</h3>
        </header>
        {/* Collect a rating and text, along with IDs required by the server. */}
        <article>
          {/* Render the selectable star rating controls. */}
          <RatingPicker />

          {/* Bind the review text input to state owned by the parent. */}
          <p>
            <input
              type="text"
              name="text"
              id="review"
              placeholder="Write your thoughts here"
              required
              value={review.text}
              onChange={(e) => onChange(e.target.value, "text")}
            />
          </p>

          {/* Include the target restaurant and author in the submitted data. */}
          <input type="hidden" name="restaurantId" value={id} />
          <input type="hidden" name="userId" value={userId} />
        </article>
        {/* Provide cancellation and submission actions for the form. */}
        <footer>
          <menu>
            <button
              autoFocus
              type="reset"
              onClick={handleClose}
              className="button--cancel"
            >
              Cancel
            </button>
            <button type="submit" value="confirm" className="button--confirm">
              Submit
            </button>
          </menu>
        </footer>
      </form>
    </dialog>
  );
};

// Export the dialog for use by the restaurant detail component.
export default ReviewDialog;

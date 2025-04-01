// RapidFunnel Universal Tracker Script
// This script detects and tracks interactions with Wistia videos, forms, and CTA buttons.

(function () {
  "use strict";
  console.log("RapidFunnel Tracker: Script file executing...");

  // --- Utility Functions ---

  // Function to extract URL parameters
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      userId: params.get("userId"),
      resourceId: params.get("resourceId"),
      contactId: params.get("contactId"),
    };
  }

  // Function to handle redirection (used by CTA, potentially others)
  function handleRedirect(url, target) {
    if (url) {
      console.log(
        `Redirecting to: ${url} ${
          target === "_blank" ? "(new tab)" : "(same tab)"
        }`
      );
      if (target === "_blank") {
        window.open(url, "_blank");
      } else {
        window.location.href = url;
      }
    } else {
      console.log("No redirect URL specified.");
    }
  }

  // --- Feature Initialization Functions ---

  // Initialize CTA Button Tracking
  function initializeCtaTracking(params) {
    // --- CTA-specific Helper Functions ---

    // Function to send the CTA notification via fetch (local to CTA tracking)
    async function sendCtaNotification(payload) {
      const apiUrl = "https://app.rapidfunnel.com/api/mail/send-cta-email";
      console.log("Sending CTA notification:", payload);
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorBody = "Could not read error response.";
          try {
            errorBody = await response.json();
          } catch (e) {
            console.warn("Could not parse error response body as JSON.");
          }
          console.error(
            `CTA notification failed: ${response.status} ${response.statusText}`,
            errorBody
          );
        } else {
          const responseData = await response.json();
          console.log("CTA notification sent successfully", responseData);
          return responseData;
        }
      } catch (error) {
        console.error("Error sending CTA notification:", error);
      }
    }

    // Function to fetch contact details (local to CTA tracking)
    async function getContactDetails(contactId) {
      if (!contactId) {
        console.warn("Invalid or missing contactId for fetching details.");
        return null;
      }
      const apiUrl = `https://apiv2.rapidfunnel.com/v2/contact-details/${contactId}`;
      console.log(`Fetching contact details for ID: ${contactId}`);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.error(
            `Failed to fetch contact details: ${response.status} ${response.statusText}`
          );
          return null;
        }
        const data = await response.json();
        if (data && data.data) {
          console.log("Contact details fetched successfully:", data.data);
          return data.data;
        } else {
          console.warn("Contact details response format unexpected:", data);
          return null;
        }
      } catch (error) {
        console.error("Error fetching contact details:", error);
        return null;
      }
    }

    // Function to generate a description for the clicked element (local to CTA tracking)
    function generateCtaDescription(element) {
      let description =
        element.getAttribute("data-description") ||
        element.getAttribute("aria-label") ||
        element.innerText ||
        element.textContent;

      // For buttons, check value/name as fallback
      if (element.tagName === "BUTTON") {
        description = description || element.value || element.name;
      }

      description = description ? description.trim() : "";

      if (!description) {
        description =
          element.tagName === "A" ? "Unnamed Link" : "Unnamed Button";
      }

      // Optional: Truncate long descriptions
      const maxLength = 100;
      if (description.length > maxLength) {
        description = description.substring(0, maxLength - 3) + "...";
      }

      return description;
    }

    // --- CTA Initialization Logic ---
    const pageName = window.rapidFunnelPageName || window.location.pathname;
    const trackableElements = document.querySelectorAll("a, button"); // Select ALL links and buttons

    if (trackableElements.length === 0) {
      console.log("No trackable links or buttons found.");
      return;
    }

    console.log(
      `Found ${trackableElements.length} potential trackable elements (links/buttons). Initializing tracking...`
    );

    trackableElements.forEach((element) => {
      element.addEventListener("click", async (event) => {
        // Generate description for this element
        const ctaButtonLocation = generateCtaDescription(element);
        console.log(
          `Click detected on ${element.tagName}: "${ctaButtonLocation}"`
        );

        // --- Prevent tracking form submit buttons as CTAs ---
        if (element.tagName === "BUTTON") {
          const parentForm = element.closest("form");
          // Check if it's inside a form AND is type="submit" or default type
          if (
            parentForm &&
            (element.type === "submit" || !element.hasAttribute("type"))
          ) {
            console.log(
              "Ignoring click on form submit button for CTA tracking."
            );
            // Allow default behavior (which might trigger form submission)
            return;
          }
        }
        // --------------------------------------------------

        // Skip if userId is missing (required for notification)
        if (!params.userId) {
          console.warn("Skipping CTA notification: Missing userId.");
          // Allow default behavior to proceed (unless prevented below for links)
          return;
        }

        // Prepare base payload
        let notificationPayload = {
          legacyUserId: Number(params.userId),
          contactFirstName: "N/A",
          contactLastName: "N/A",
          contactPhoneNumber: "N/A",
          contactEmail: "N/A",
          ctaLocation: ctaButtonLocation,
          ctaPageName: pageName,
        };

        // Handle links (<a>) vs buttons (<button>)
        if (element.tagName === "A") {
          event.preventDefault(); // Prevent immediate navigation for links
          console.log("[CTA Link] Event prevented.");
          const redirectUrl = element.getAttribute("href");
          const target = element.getAttribute("target") || "_self";

          // Fetch contact details if contactId exists
          if (params.contactId) {
            console.log("[CTA Link] Before await getContactDetails.");
            const contactDetails = await getContactDetails(params.contactId); // Wait here before sending notification
            console.log(
              "[CTA Link] After await getContactDetails. Details:",
              contactDetails
            );
            if (contactDetails) {
              notificationPayload.contactFirstName =
                contactDetails.firstName || "N/A";
              notificationPayload.contactLastName =
                contactDetails.lastName || "N/A";
              notificationPayload.contactPhoneNumber =
                contactDetails.phone || "N/A";
              notificationPayload.contactEmail = contactDetails.email || "N/A";
            } else {
              notificationPayload.contactFirstName =
                "System failed to retrieve";
              notificationPayload.contactLastName = `Contact ID: ${params.contactId}`;
            }
          } else {
            notificationPayload.contactFirstName = "No contact ID found";
            console.log("[CTA Link] No contactId to fetch.");
          }

          // Attempt notification, then redirect regardless
          try {
            console.log("[CTA Link] Before await sendCtaNotification.");
            await sendCtaNotification(notificationPayload);
            console.log("[CTA Link] After await sendCtaNotification.");
          } catch (error) {
            console.error(
              "[CTA Link] Notification sending failed (handled).",
              error
            );
          } finally {
            console.log(
              "[CTA Link] Inside finally block, before handleRedirect."
            );
            handleRedirect(redirectUrl, target);
            console.log(
              "[CTA Link] Inside finally block, after handleRedirect call."
            );
          }
        } else if (element.tagName === "BUTTON") {
          // For buttons, send notification but DO NOT prevent default behavior
          // (unless we want to handle custom redirection via data-href)
          sendCtaNotification(notificationPayload) // Send async, don't wait
            .then(() => {
              // Optional: Check for custom redirect on button after notification attempt
              const redirectUrl = element.getAttribute("data-href");
              const target = element.getAttribute("data-target"); // Optional target for button redirect
              if (redirectUrl) {
                console.log(
                  "Handling custom redirect for button:",
                  redirectUrl
                );
                handleRedirect(redirectUrl, target || "_self");
              }
            })
            .catch((error) => {
              console.error("Notification sending failed (button click).");
            });
          // Allow button's default action (e.g., form submit) to proceed
        }
      }); // End event listener
    }); // End forEach
  }

  // Initialize Video Tracking
  function initializeVideoTracking(params) {
    console.log("Initializing Video Tracking...", params);

    // --- Video-specific Helper Functions ---

    // Function to send video play data to the API
    async function sendVideoPlayData(payload) {
      const apiUrl = "https://my.rapidfunnel.com/landing/resource/push-to-sqs";
      const bodyParams = new URLSearchParams(payload);
      const requestBody = bodyParams.toString();

      console.log("Sending video play data to:", apiUrl);
      console.log("Request Body (URL-encoded):", requestBody);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: requestBody,
        });

        if (!response.ok) {
          let errorBody = "Could not read error response.";
          try {
            errorBody = await response.json();
          } catch (e) {
            /* Ignore */
          }
          console.error(
            `Video tracking submission failed: ${response.status} ${response.statusText}`,
            errorBody
          );
        } else {
          // Response might be empty or JSON, attempt to parse if content-type suggests it
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const responseData = await response.json();
            console.log("Video tracking submitted successfully:", responseData);
            // Docs example checks response for truthiness, handle if needed
            if (!responseData) {
              console.warn("Video tracking API returned a falsy response.");
            }
          } else {
            console.log(
              "Video tracking submitted successfully (non-JSON response)."
            );
          }
        }
      } catch (error) {
        console.error("Error sending video tracking data:", error);
      }
    }

    // --- Video Initialization Logic ---

    // Check if Wistia Player API queue exists
    if (typeof window._wq === "undefined") {
      console.log(
        "Wistia Player API (_wq) not found. Skipping video tracking initialization."
      );
      return;
    }

    // Push handler onto Wistia queue
    window._wq = window._wq || [];
    window._wq.push({
      _all: function (video) {
        console.log("Wistia video found:", video.hashedId());

        video.bind("play", () => {
          console.log("Video play event detected for:", video.hashedId());

          // Validate required params from URL (must be numeric based on docs example)
          const { userId, resourceId, contactId } = params;
          const isValidNumber = (val) => val && /^[0-9]+$/.test(val);

          if (
            !isValidNumber(userId) ||
            !isValidNumber(resourceId) ||
            !isValidNumber(contactId)
          ) {
            console.warn(
              "Cannot track video play: Missing or non-numeric userId, resourceId, or contactId in URL params."
            );
            return;
          }

          // Gather data for API payload
          const webinarInput = document.getElementById("webinar"); // Optional field from docs
          const payload = {
            resourceId: resourceId,
            contactId: contactId,
            userId: userId,
            percentageWatched: 0, // Initial play event
            mediaHash: video.hashedId(),
            duration: video.duration(),
            visitorKey: video.visitorKey(),
            eventKey: video.eventKey(),
            delayProcess: 1,
            webinar: webinarInput ? webinarInput.value : "", // Include if element exists
          };

          // Send data to the API
          sendVideoPlayData(payload);
        }); // End bind('play')
      }, // End _all function
    }); // End _wq.push

    console.log(
      "Wistia video tracking initialized. Waiting for play events..."
    );
  }

  // Initialize Form Tracking
  function initializeFormTracking(params) {
    // --- Form-specific Helper Functions ---

    // Function to find specific input fields within a form using common patterns
    function findFormFields(form) {
      const fields = {
        firstNameInput: null,
        lastNameInput: null,
        nameInput: null, // For combined name fields
        emailInput: null,
        phoneInput: null,
      };

      // Prioritize specific types first
      fields.emailInput = form.querySelector('input[type="email"]');
      fields.phoneInput = form.querySelector('input[type="tel"]');

      // Regex patterns for common names (case-insensitive)
      const patterns = {
        firstName: [
          /first.?name/i,
          /fname/i,
          /first_name/i,
          /first-name/i,
          /firstname/i,
        ],
        lastName: [
          /last.?name/i,
          /lname/i,
          /surname/i,
          /last_name/i,
          /last-name/i,
        ],
        name: [/^name$/i, /full.?name/i, /your.?name/i], // Combined name
        email: [/e.?mail/i], // Check if type="email" wasn't found
        phone: [/phone/i, /mobile/i, /contact.?number/i], // Check if type="tel" wasn't found
      };

      const attrs = ["id", "name", "class", "placeholder", "aria-label"];
      const foundElements = new Set(); // Keep track of elements already assigned

      // Find fields using patterns
      for (const fieldKey in patterns) {
        const inputKey = `${fieldKey}Input`; // e.g., firstNameInput
        // Skip if already found (e.g., by type), unless it's email/phone (might find better match)
        if (fields[inputKey] && fieldKey !== "email" && fieldKey !== "phone")
          continue;

        patterns[fieldKey].some((regex) => {
          return Array.from(form.elements).some((input) => {
            // Skip if element already used for another field
            if (foundElements.has(input)) return false;
            // Only check relevant input types
            if (
              !["text", "email", "tel", "hidden"].includes(
                input.type.toLowerCase()
              )
            )
              return false;

            return attrs.some((attr) => {
              const value = input.getAttribute(attr);
              if (value && regex.test(value)) {
                // If email/phone found by type initially, but we find another match,
                // check if the new match isn't the one already found by type.
                // This prioritizes specific name matches over generic type matches if names conflict.
                if (
                  (fieldKey === "email" && fields.emailInput === input) ||
                  (fieldKey === "phone" && fields.phoneInput === input)
                ) {
                  return false; // Already assigned via type, don't re-assign based on name
                }

                fields[inputKey] = input;
                foundElements.add(input); // Mark element as used
                // console.log(`Found ${fieldKey} match:`, input, `via attribute ${attr}`);
                return true; // Stop checking attrs and inputs for this pattern
              }
              return false;
            });
          });
        });
      }

      // Condition for tracking: Must have at least email OR phone
      const canTrack = !!(fields.emailInput || fields.phoneInput);

      if (!canTrack) {
        console.log(
          "Form cannot be tracked (missing email and phone): ",
          form.id || "Unnamed"
        );
        return null; // Indicate cannot track this form
      }

      console.log(
        "Identified potential contact fields in form:",
        form.id || "Unnamed",
        fields
      );
      return fields; // Return found fields (even if incomplete)
    }

    // Function to send form data to the API (Aligned with Docs & Payload Image)
    async function submitContactForm(
      formDataString,
      resourceId,
      senderId,
      formElement
    ) {
      const apiUrl =
        "https://my.rapidfunnel.com/landing/resource/create-custom-contact";

      // Construct the body as URL-encoded parameters
      const bodyParams = new URLSearchParams();
      bodyParams.append("formData", formDataString);
      bodyParams.append("resourceId", resourceId);
      bodyParams.append("senderId", senderId);
      // Determine sentFrom value
      let sentFromValue = window.location.href;
      if (sentFromValue.startsWith("file://")) {
        sentFromValue = "customPage"; // Use 'customPage' for local files
      }
      bodyParams.append("sentFrom", sentFromValue);
      const requestBody = bodyParams.toString();

      console.log("Submitting contact form data to:", apiUrl);
      console.log("Request Body (URL-encoded):", requestBody);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            // Set correct Content-Type for form data
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            // Keep Accept header as API likely responds with JSON
            Accept: "application/json, text/javascript, */*; q=0.01",
          },
          body: requestBody, // Send the URL-encoded string directly
        });

        if (!response.ok) {
          let errorBody = "Could not read error response.";
          try {
            errorBody = await response.json();
          } catch (e) {
            /* Ignore */
          }
          console.error(
            `Contact form submission failed: ${response.status} ${response.statusText}`,
            errorBody
          );
          return null;
        }
        const responseData = await response.json();
        console.log("Contact form submitted successfully:", responseData);
        const newContactId = responseData.contactId || null;
        if (!newContactId || newContactId <= 0) {
          console.error(
            "Form submitted but no valid contactId received.",
            responseData
          );
          return null;
        }
        let nextPageUrl = window.rapidFunnelNextPage;
        if (!nextPageUrl) {
          const submitContainer = document.getElementById(
            "contactFormSubmitContainer"
          );
          if (submitContainer) {
            nextPageUrl = submitContainer.getAttribute("data-redirect");
          }
        }
        if (nextPageUrl) {
          console.log("Redirect URL found:", nextPageUrl);
          try {
            const redirectUrl = new URL(nextPageUrl, window.location.origin);
            redirectUrl.searchParams.set("userId", String(senderId));
            redirectUrl.searchParams.set("resourceId", String(resourceId));
            redirectUrl.searchParams.set("contactId", String(newContactId));
            console.log("Redirecting to:", redirectUrl.toString());
            window.location.href = redirectUrl.toString();
          } catch (urlError) {
            console.error("Error constructing redirect URL:", urlError);
          }
        } else {
          console.log("No redirect URL specified. Staying on page.");
        }
        return newContactId; // Return the new ID on success
      } catch (error) {
        console.error("Error submitting contact form:", error);
        return null;
      }
    }

    // --- Form Initialization Logic ---

    console.log(
      "Initializing Form Tracking with event delegation (listening on document)."
    );

    document.addEventListener("submit", async (event) => {
      // Check if the submission target is a form
      if (!(event.target instanceof HTMLFormElement)) {
        return; // Not a form submission, ignore
      }

      const form = event.target;
      console.log(
        "Submit event caught by delegate listener for form:",
        form.id || "Unnamed form"
      );

      const identifiedFields = findFormFields(form);

      // Only track if at least email OR phone was found
      if (identifiedFields) {
        console.log(
          "Trackable form identified (has email/phone). Processing submission..."
        );
        event.preventDefault(); // Prevent default form submission ONLY for trackable forms
        console.log(
          "Default submission prevented for:",
          form.id || "Unnamed form"
        );

        // Use the identified fields
        const {
          firstNameInput,
          lastNameInput,
          nameInput,
          emailInput,
          phoneInput,
        } = identifiedFields;

        // --- Validation (only validate found fields) ---
        const emailValue = emailInput?.value?.trim();
        const phoneValue = phoneInput?.value?.trim();

        // Must have at least email or phone value to submit
        if (!emailValue && !phoneValue) {
          console.warn(
            "Form submission stopped: Missing both email and phone value."
          );
          // Re-enable submit button if validation fails *before* API call attempt
          const submitButton = form.querySelector('[type="submit"]');
          if (submitButton) submitButton.disabled = false;
          return;
        }
        // Validate email format if present
        if (emailValue && !/\S+@\S+\.\S+/.test(emailValue)) {
          console.warn("Form submission stopped: Invalid email format.");
          // Re-enable submit button if validation fails *before* API call attempt
          const submitButton = form.querySelector('[type="submit"]');
          if (submitButton) submitButton.disabled = false;
          return;
        }
        // Add other specific validations if needed (e.g., phone format)

        // --- Construct Payload (using only available fields) ---
        let firstName = "";
        let lastName = "";

        if (firstNameInput?.value && lastNameInput?.value) {
          firstName = firstNameInput.value.trim();
          lastName = lastNameInput.value.trim();
        } else if (nameInput?.value) {
          const nameParts = nameInput.value.trim().split(/\s+/);
          firstName = nameParts.shift() || "";
          lastName = nameParts.join(" ");
        } else if (firstNameInput?.value) {
          // Only first name found
          firstName = firstNameInput.value.trim();
        } else if (lastNameInput?.value) {
          // Only last name found (use as first?)
          firstName = lastNameInput.value.trim(); // Or should this be lastName?
        }

        const payload = {};
        if (firstName) payload.firstName = firstName;
        if (lastName) payload.lastName = lastName;
        if (emailValue) payload.email = emailValue;
        if (phoneValue) payload.phone = phoneValue;

        // Get optional campaign/label IDs
        payload.campaign = window.rapidFunnelCampaignId || 0;
        payload.contactTag = window.rapidFunnelLabelId || 0;

        // Construct the URL-encoded formData string
        const formDataString = new URLSearchParams(payload).toString();

        // Check for essential URL params
        if (!params.userId || !params.resourceId) {
          console.error(
            "Cannot submit form: Missing userId or resourceId in URL."
          );
          // Don't re-enable button here as we didn't disable it yet
          return;
        }
        const resourceId = Number(params.resourceId);
        const senderId = Number(params.userId);

        // Disable submit button *before* API call
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        // Call the helper to submit the data
        const newContactId = await submitContactForm(
          formDataString,
          resourceId,
          senderId,
          form
        );

        // Re-enable button ONLY if submission failed OR there's no redirect planned
        if (
          submitButton &&
          (!newContactId ||
            (!window.rapidFunnelNextPage &&
              !document
                .getElementById("contactFormSubmitContainer")
                ?.getAttribute("data-redirect")))
        ) {
          console.log("Re-enabling submit button.");
          submitButton.disabled = false;
        }
      } else {
        console.log(
          "Form submitted but not tracked (missing email/phone):",
          form.id || "Unnamed form"
        );
        // Allow default submission for non-tracked forms
      }
    }); // End document event listener
  }

  // --- Main Execution ---

  function runInitializationLogic() {
    console.log("Running initialization logic...");
    const params = getUrlParams();
    console.log("RapidFunnel Tracker Initialized. Params:", params);

    // Basic check for essential params needed for most tracking
    if (!params.userId || !params.resourceId) {
      console.warn(
        "RapidFunnel Tracker: userId or resourceId missing from URL parameters. Tracking might be limited."
      );
      // Continue initialization even if params are missing, features might handle this
    }

    // Initialize all tracking features
    initializeCtaTracking(params);
    initializeVideoTracking(params);
    initializeFormTracking(params);
  }

  // Check if DOM is already ready or wait for body
  if (
    document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)
  ) {
    // Document is already interactive or complete
    console.log(
      "DOM ready on initial check (readyState). Running initializers."
    );
    runInitializationLogic();
  } else if (document.body) {
    // Body already parsed, likely safe to run
    console.log("DOM body found on initial check. Running initializers.");
    runInitializationLogic();
  } else {
    // Body not ready, poll or use fallback listener
    console.log("DOM not ready, setting up interval check for document.body.");
    let checkInterval = null;
    let checksLeft = 50; // Safety limit: 50 * 100ms = 5 seconds

    const checkBody = () => {
      checksLeft--;
      if (document.body || checksLeft <= 0) {
        console.log(
          checksLeft > 0
            ? "document.body found by polling."
            : "Polling timeout reached."
        );
        clearInterval(checkInterval);
        // Ensure we run only once, even if DOMContentLoaded also fires somehow
        if (!window.rfTrackerInitialized) {
          window.rfTrackerInitialized = true;
          runInitializationLogic();
        }
      }
    };

    // Also add DOMContentLoaded as a primary fallback, just in case it works sometimes
    document.addEventListener("DOMContentLoaded", () => {
      console.log("DOMContentLoaded event fired (fallback).");
      clearInterval(checkInterval); // Stop polling if event fires
      if (!window.rfTrackerInitialized) {
        window.rfTrackerInitialized = true;
        runInitializationLogic();
      }
    });

    checkInterval = setInterval(checkBody, 100);
  }
})();

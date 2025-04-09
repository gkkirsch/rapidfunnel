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

  // Function to find specific input fields ANYWHERE on the page using common patterns
  function findAllPageInputs() {
    const fields = {
      firstNameInput: null,
      lastNameInput: null,
      nameInput: null, // For combined name fields
      emailInput: null,
      phoneInput: null,
    };

    // Prioritize specific types first across the whole document
    fields.emailInput = document.querySelector('input[type="email"]');
    fields.phoneInput = document.querySelector('input[type="tel"]');

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

    // Get all potentially relevant inputs from the entire page
    const allInputs = document.querySelectorAll(
      'input[type="text"], input[type="email"], input[type="tel"], input[type="hidden"], textarea'
    ); // Include textarea

    // Find fields using patterns by checking all inputs on the page
    for (const fieldKey in patterns) {
      const inputKey = `${fieldKey}Input`; // e.g., firstNameInput
      // Skip if already found (e.g., by type), unless it's email/phone (might find better match)
      if (fields[inputKey] && fieldKey !== "email" && fieldKey !== "phone")
        continue;

      patterns[fieldKey].some((regex) => {
        return Array.from(allInputs).some((input) => {
          // Skip if element already used for another field
          if (foundElements.has(input)) return false;

          return attrs.some((attr) => {
            const value = input.getAttribute(attr);
            if (value && regex.test(value)) {
              // If email/phone found by type initially, but we find another match,
              // check if the new match isn't the one already found by type.
              if (
                (fieldKey === "email" && fields.emailInput === input) ||
                (fieldKey === "phone" && fields.phoneInput === input)
              ) {
                return false; // Already assigned via type, don't re-assign based on name
              }

              fields[inputKey] = input;
              foundElements.add(input); // Mark element as used
              return true; // Stop checking attrs and inputs for this pattern
            }
            return false;
          });
        });
      });
    }

    // Condition for tracking: Must have at least email OR phone input identified
    const canTrack = !!(fields.emailInput || fields.phoneInput);

    if (!canTrack) {
      console.log(
        "Could not find trackable inputs (email or phone) anywhere on the page."
      );
      return null; // Indicate cannot track
    }

    console.log("Identified potential contact inputs on the page:", fields);
    return fields; // Return found fields
  }

  // Function to send form data (collected from page) to the API
  // NOTE: Removed redirect logic from this function.
  async function submitContactForm(
    formDataString,
    resourceId,
    senderId
    // removed formElement parameter as it's no longer directly relevant here
  ) {
    const apiUrl =
      "https://my.rapidfunnel.com/landing/resource/create-custom-contact";

    // Construct the body as URL-encoded parameters
    const bodyParams = new URLSearchParams();
    bodyParams.append("formData", formDataString);
    bodyParams.append("resourceId", resourceId);
    bodyParams.append("senderId", senderId);
    // Determine sentFrom value
    let sentFromValue = "customPage";
    if (sentFromValue.startsWith("file://")) {
      sentFromValue = "customPage"; // Use 'customPage' for local files
    }
    bodyParams.append("sentFrom", sentFromValue);
    const requestBody = bodyParams.toString();

    console.log("Submitting page contact data to:", apiUrl);
    console.log("Request Body (URL-encoded):", requestBody);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/javascript, */*; q=0.01",
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
          `Contact data submission failed: ${response.status} ${response.statusText}`,
          errorBody
        );
        return null; // Indicate failure
      }
      const responseData = await response.json();
      console.log("Contact data submitted successfully:", responseData);
      const newContactId = responseData.contactId || null;
      if (!newContactId || newContactId <= 0) {
        console.error(
          "Submission successful but no valid contactId received.",
          responseData
        );
        return null; // Indicate invalid contactId
      }
      // ** Redirect logic removed - to be handled by the caller **
      return newContactId; // Return the new ID on success
    } catch (error) {
      console.error("Error submitting contact data:", error);
      return null; // Indicate failure
    }
  }

  // --- Feature Initialization Functions ---

  // Initialize CTA Button Tracking (Now handles submit buttons too)
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
    const trackableElements = document.querySelectorAll("a, button");

    if (trackableElements.length === 0) {
      console.log("No trackable links or buttons found.");
      return;
    }

    console.log(
      `Found ${trackableElements.length} potential trackable elements (links/buttons). Initializing tracking...`
    );

    trackableElements.forEach((element) => {
      element.addEventListener("click", async (event) => {
        const ctaButtonLocation = generateCtaDescription(element);
        console.log(
          `Click detected on ${element.tagName}: "${ctaButtonLocation}"`
        );

        // Skip if essential params missing (userId needed for both CTA and Submit)
        if (!params.userId || !params.resourceId) {
          console.warn(
            "Skipping action: Missing userId or resourceId in URL params."
          );
          return;
        }

        // --- Handle Buttons ---
        if (element.tagName === "BUTTON") {
          const isSubmitButton =
            element.type === "submit" ||
            (!element.hasAttribute("type") && element.closest("form"));

          // --- Submit Button Logic ---
          if (isSubmitButton) {
            console.log("[Submit Button] Click detected.");
            event.preventDefault(); // Prevent default form submission
            console.log("[Submit Button] Default action prevented.");

            const identifiedInputs = findAllPageInputs(); // Scan the whole page

            if (identifiedInputs) {
              console.log("[Submit Button] Found trackable inputs on page.");
              const {
                firstNameInput,
                lastNameInput,
                nameInput,
                emailInput,
                phoneInput,
              } = identifiedInputs;

              // Validation
              const emailValue = emailInput?.value?.trim();
              const phoneValue = phoneInput?.value?.trim();

              if (!emailValue && !phoneValue) {
                console.warn(
                  "[Submit Button] Submission stopped: Missing both email and phone value on page."
                );
                return; // Don't disable/submit if basic validation fails
              }
              if (emailValue && !/\S+@\S+\.\S+/.test(emailValue)) {
                console.warn(
                  "[Submit Button] Submission stopped: Invalid email format."
                );
                return; // Don't disable/submit
              }

              // Construct Payload
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
                firstName = firstNameInput.value.trim();
              } else if (lastNameInput?.value) {
                firstName = lastNameInput.value.trim();
              }

              const payload = {};
              if (firstName) payload.firstName = firstName;
              if (lastName) payload.lastName = lastName;
              if (emailValue) payload.email = emailValue;
              if (phoneValue) payload.phone = phoneValue;
              payload.campaign = window.rapidFunnelCampaignId || 0;
              payload.contactTag = window.rapidFunnelLabelId || 0;
              const formDataString = new URLSearchParams(payload).toString();

              const resourceId = Number(params.resourceId);
              const senderId = Number(params.userId);

              // Disable button before API call
              element.disabled = true;
              console.log("[Submit Button] Disabled.");

              // Call the contact submission helper
              const newContactId = await submitContactForm(
                formDataString,
                resourceId,
                senderId
              );

              // Handle redirect OR re-enable button
              const redirectUrlAttr = element.getAttribute("data-redirect");
              let redirected = false;
              if (newContactId && redirectUrlAttr) {
                console.log(
                  "[Submit Button] Redirect URL found on button:",
                  redirectUrlAttr
                );
                try {
                  const redirectUrl = new URL(
                    redirectUrlAttr,
                    window.location.origin
                  );
                  redirectUrl.searchParams.set("userId", String(senderId));
                  redirectUrl.searchParams.set(
                    "resourceId",
                    String(resourceId)
                  );
                  redirectUrl.searchParams.set(
                    "contactId",
                    String(newContactId)
                  );
                  console.log(
                    "[Submit Button] Redirecting to:",
                    redirectUrl.toString()
                  );
                  window.location.href = redirectUrl.toString();
                  redirected = true; // Set flag to prevent re-enabling
                } catch (urlError) {
                  console.error(
                    "[Submit Button] Error constructing redirect URL:",
                    urlError
                  );
                  // Proceed to re-enable button below if redirect failed
                }
              } else if (newContactId) {
                console.log(
                  "[Submit Button] Submission successful, but no data-redirect found on button. Staying on page."
                );
                // Will re-enable below
              } else {
                console.warn(
                  "[Submit Button] Submission failed or returned invalid contactId."
                );
                // Will re-enable below
              }

              // Re-enable button if not redirected
              if (!redirected) {
                console.log("[Submit Button] Re-enabling button.");
                element.disabled = false;
              }
            } else {
              console.warn(
                "[Submit Button] Clicked, but no trackable inputs (email/phone) found on the page. No action taken."
              );
              // Do nothing further, default was already prevented
            }

            // --- Standard CTA Button Logic ---
          } else {
            console.log("[CTA Button] Click detected.");
            // Prepare base payload for CTA notification
            let notificationPayload = {
              legacyUserId: Number(params.userId),
              contactFirstName: "N/A", // Default values
              contactLastName: "N/A",
              contactPhoneNumber: "N/A",
              contactEmail: "N/A",
              ctaLocation: ctaButtonLocation,
              ctaPageName: pageName,
            };

            // Attempt to fetch contact details ONLY if contactId exists (standard CTA behavior)
            if (params.contactId) {
              const contactDetails = await getContactDetails(params.contactId);
              if (contactDetails) {
                notificationPayload.contactFirstName =
                  contactDetails.firstName || "N/A";
                notificationPayload.contactLastName =
                  contactDetails.lastName || "N/A";
                notificationPayload.contactPhoneNumber =
                  contactDetails.phone || "N/A";
                notificationPayload.contactEmail =
                  contactDetails.email || "N/A";
              } else {
                notificationPayload.contactFirstName =
                  "System failed to retrieve";
                notificationPayload.contactLastName = `Contact ID: ${params.contactId}`;
              }
            } else {
              notificationPayload.contactFirstName = "No contact ID found";
            }

            // Send CTA notification (don't wait for it unless redirecting)
            const notificationPromise =
              sendCtaNotification(notificationPayload);

            // Check for custom redirect on the button itself
            const redirectUrl = element.getAttribute("data-href");
            const target = element.getAttribute("data-target") || "_self";

            if (redirectUrl) {
              console.log(
                "[CTA Button] Found data-href, will redirect after notification attempt."
              );
              // Wait for notification attempt before redirecting
              try {
                await notificationPromise;
              } catch (e) {
                /* Ignore notification error */
              }
              handleRedirect(redirectUrl, target);
            } else {
              console.log(
                "[CTA Button] No data-href found. Allowing default button action (if any) after notification attempt."
              );
              // Allow default button action (if any) to proceed. Do NOT preventDefault.
            }
          }

          // --- Handle Links ---
        } else if (element.tagName === "A") {
          console.log("[CTA Link] Click detected.");
          event.preventDefault(); // Prevent immediate navigation for links
          console.log("[CTA Link] Default navigation prevented.");

          const redirectUrl = element.getAttribute("href");
          const target = element.getAttribute("target") || "_self";

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

          // Fetch contact details if contactId exists
          if (params.contactId) {
            const contactDetails = await getContactDetails(params.contactId);
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
          }

          // Attempt notification, then redirect regardless
          try {
            console.log("[CTA Link] Sending notification...");
            await sendCtaNotification(notificationPayload);
            console.log("[CTA Link] Notification sent (or attempt finished).");
          } catch (error) {
            console.error(
              "[CTA Link] Notification sending failed (error caught).",
              error
            );
          } finally {
            console.log("[CTA Link] Proceeding to redirect.");
            handleRedirect(redirectUrl, target);
          }
        }
      }); // End event listener
    }); // End forEach
  }

  // Initialize Video Tracking
  function initializeVideoTracking(params) {
    console.log("Initializing Video Tracking...", params);

    // --- Video-specific Helper Functions ---

    // Function to load Wistia script if not already present
    function loadWistiaScript() {
      return new Promise((resolve, reject) => {
        // Check if script is already loaded
        if (typeof window._wq !== "undefined") {
          console.log("Wistia API already loaded");
          resolve();
          return;
        }

        // Check if script is already in the process of loading
        if (
          document.querySelector(
            'script[src*="wistia.com/assets/external/E-v1.js"]'
          )
        ) {
          console.log("Wistia script already loading");
          waitForWistiaAPI(resolve);
          return;
        }

        // Load the script
        console.log("Loading Wistia script...");
        const script = document.createElement("script");
        script.src = "https://fast.wistia.com/assets/external/E-v1.js";
        script.async = true;

        script.onload = () => {
          console.log("Wistia script loaded successfully");
          waitForWistiaAPI(resolve);
        };

        script.onerror = (error) => {
          console.error("Failed to load Wistia script:", error);
          reject(new Error("Failed to load Wistia script"));
        };

        document.head.appendChild(script);
      });
    }

    // Function to check if Wistia API is available
    function waitForWistiaAPI(callback) {
      if (typeof window._wq !== "undefined") {
        console.log("Wistia API already available");
        callback();
        return;
      }

      console.log("Waiting for Wistia API to load...");
      let checkInterval = setInterval(() => {
        if (typeof window._wq !== "undefined") {
          clearInterval(checkInterval);
          console.log("Wistia API loaded");
          callback();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn("Wistia API failed to load after 10 seconds");
      }, 10000);
    }

    // Function to send video play data to the API
    async function sendVideoPlayData(payload) {
      const apiUrl = "https://my.rapidfunnel.com/landing/resource/push-to-sqs";

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Accept: "application/json",
          },
          body: new URLSearchParams(payload).toString(),
        });

        if (!response.ok) {
          console.error(
            `Video tracking submission failed: ${response.status} ${response.statusText}`
          );
          return;
        }

        // Only try to parse as JSON if the response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          console.log("Video tracking submitted successfully:", data);
        } else {
          console.log("Video tracking submitted successfully");
        }
      } catch (error) {
        console.error("Error sending video tracking data:", error);
      }
    }

    // --- Video Initialization Logic ---

    // Load Wistia script and initialize tracking
    loadWistiaScript()
      .then(() => {
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

              if (!isValidNumber(userId) || !isValidNumber(contactId)) {
                console.warn(
                  "Cannot track video play: Missing or non-numeric userId, resourceId, or contactId in URL params."
                );
                return;
              }

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
                webinar: "",
              };

              // Send initial play data
              sendVideoPlayData(payload);
            });

            // Track progress
            const progressMilestones = [25, 50, 75, 100];
            let lastReportedProgress = 0;
            let hasEnded = false;

            // Reset progress tracking when video ends or is paused
            video.bind("end", () => {
              console.log(
                `Video ${video.hashedId()} ended, resetting progress tracking`
              );
              lastReportedProgress = 0;
              hasEnded = true;
            });

            video.bind("pause", () => {
              console.log(
                `Video ${video.hashedId()} paused, resetting progress tracking`
              );
              lastReportedProgress = 0;
            });

            video.bind("play", () => {
              // Reset ended flag when video starts playing again
              hasEnded = false;
            });

            video.bind("timechange", () => {
              // Don't track progress if video has ended
              if (hasEnded) {
                return;
              }

              const currentTime = video.time();
              const duration = video.duration();
              const percentageWatched = Math.round(
                (currentTime / duration) * 100
              );

              // Don't track progress if we're past 100%
              if (percentageWatched > 100) {
                return;
              }

              // Check if we've reached a new milestone
              for (const milestone of progressMilestones) {
                if (
                  percentageWatched >= milestone &&
                  lastReportedProgress < milestone
                ) {
                  console.log(
                    `Video ${video.hashedId()} reached ${milestone}% watched (current: ${percentageWatched}%, last reported: ${lastReportedProgress}%)`
                  );

                  const { userId, resourceId, contactId } = params;
                  const payload = {
                    resourceId: resourceId,
                    contactId: contactId,
                    userId: userId,
                    percentageWatched: milestone,
                    mediaHash: video.hashedId(),
                    duration: video.duration(),
                    visitorKey: video.visitorKey(),
                    eventKey: video.eventKey(),
                    delayProcess: 1,
                    webinar: "",
                  };

                  sendVideoPlayData(payload);
                  lastReportedProgress = milestone;
                  break;
                }
              }
            });
          }, // End _all function
        }); // End _wq.push

        console.log(
          "Wistia video tracking initialized. Waiting for play events..."
        );
      })
      .catch((error) => {
        console.error("Failed to initialize Wistia tracking:", error);
      });
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
    initializeCtaTracking(params); // Handles buttons (submit & CTA) and links
    initializeVideoTracking(params);
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

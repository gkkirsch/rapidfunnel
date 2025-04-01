# RapidFunnel Universal Tracker Script

This repository contains the code for a JavaScript snippet designed to be embedded on websites to track user interactions with Wistia videos, contact forms, and Call-to-Action (CTA) elements (links and buttons), sending relevant data to the RapidFunnel platform.

## Purpose

The goal is to provide a lightweight, dependency-free (no jQuery) script that website owners can easily add to their pages ("plug and play"). The script automatically detects trackable elements based on common patterns and sends interaction data to RapidFunnel, associating the activity with the correct user and resource derived from URL parameters.

## Features

*   **URL Parameter Extraction:** Automatically reads `userId`, `resourceId`, and `contactId` from the URL query string.
*   **Wistia Video Tracking:** Detects embedded Wistia videos and tracks `play` events using the Wistia Player API (`_wq`).
*   **Form Submission Tracking:** Automatically detects forms containing identifiable email or phone number fields. Attempts to find common name fields (first name, last name, full name). Sends captured data upon submission.
*   **CTA Tracking:** Tracks clicks on *all* links (`<a>`) and buttons (`<button>`) on the page, excluding form submit buttons. Attempts to generate a meaningful description based on element content or attributes.
*   **Contact Detail Fetching:** If a `contactId` is present in the URL, CTA clicks will attempt to fetch contact details to enrich the notification sent.
*   **Vanilla JavaScript:** No external libraries like jQuery required.

## Integration Guide

Follow these steps to add the RapidFunnel tracker to your website:

1.  **Get the Script File:**
    *   **Recommended:** Create a minified version of `src/rapidfunnel-tracker.js`. You can use an online tool like [Terser](https://try.terser.org/) or [javascript-minifier.com](https://javascript-minifier.com/). Save the output as `rapidfunnel-tracker.min.js`.
    *   **Alternatively:** You can use the raw `src/rapidfunnel-tracker.js` file directly, but it will be larger.

2.  **Upload the Script:** Place the script file (e.g., `rapidfunnel-tracker.min.js`) onto your web server or hosting platform, typically within a `js` or `assets` folder.

3.  **Include Script in HTML:** Add the following `<script>` tag to your HTML pages, preferably just before the closing `</body>` tag. Make sure the `src` path points to where you uploaded the script file.
    ```html
    <!-- Add this line before the closing </body> tag -->
    <script src="/path/to/your/js/rapidfunnel-tracker.min.js" defer></script>
    </body>
    </html>
    ```
    *Using `defer` ensures the script executes after the HTML is parsed but before the `DOMContentLoaded` event, which is ideal.* 

4.  **Ensure URL Parameters:** This is crucial. The tracking script **requires** the page URL to contain `userId` and `resourceId` parameters when the page is loaded via a RapidFunnel share. The `contactId` parameter is also used if present (for video/CTA tracking context).
    *Example URL:* `https://yourwebsite.com/landing-page?userId=12345&resourceId=67890&contactId=112233`

5.  **(Optional) Configuration:** You can customize some tracking behavior by defining global JavaScript variables *before* the main tracker script loads. Add a `<script>` block **before** the line that includes `rapidfunnel-tracker.min.js`:
    ```html
    <script>
      // Optional: Set a specific page name for CTA notifications
      // window.rapidFunnelPageName = "My Awesome Landing Page";

      // Optional: Set default Campaign ID for new contacts created via tracked forms
      // window.rapidFunnelCampaignId = 123; // Replace 123 with your actual Campaign ID

      // Optional: Set default Label ID (Contact Tag) for new contacts
      // window.rapidFunnelLabelId = 456; // Replace 456 with your actual Label ID

      // Optional: Set a redirect URL for tracked forms after successful submission
      // window.rapidFunnelNextPage = "https://yourwebsite.com/thank-you"; 
    </script>

    <!-- Include the main tracker script AFTER the configuration block -->
    <script src="/path/to/your/js/rapidfunnel-tracker.min.js" defer></script>
    </body>
    </html>
    ```
    *Uncomment and set the values you need.* 

6.  **Wistia Videos:** Ensure your Wistia videos are embedded using standard Wistia methods so that the `_wq` Player API is available on the page.

7.  **Forms:** The script attempts to find forms with at least an email (`<input type="email">` or common names) or phone (`<input type="tel">` or common names) field. It also looks for common first/last/full name fields. It might not correctly identify fields in all custom form structures. For maximum reliability with form tracking, using HTML similar to the RapidFunnel documentation examples (which may use specific classes) is recommended if possible, although the script *tries* to work without them.

## Development

*   The main source code is in `src/rapidfunnel-tracker.js`.
*   `index.html` provides a test page for local development.

## Dependencies

*   None for the runtime script.

# RapidFunnel Universal Tracker Script

This repository contains the code for a JavaScript snippet designed to be embedded on websites to track user interactions with Wistia videos, contact forms, and Call-to-Action (CTA) elements (links and buttons), sending relevant data to the RapidFunnel platform.

## Purpose

The goal is to provide a lightweight, dependency-free (no jQuery) script that website owners can easily add to their pages ("plug and play"). The script automatically detects trackable elements based on common patterns and sends interaction data to RapidFunnel, associating the activity with the correct user and resource derived from URL parameters.

## Features

- **URL Parameter Extraction:** Automatically reads `userId`, `resourceId`, and `contactId` from the URL query string.
- **Wistia Video Tracking:** Detects embedded Wistia videos and tracks `play` events using the Wistia Player API (`_wq`).
- **Form Submission Tracking:** Automatically detects forms containing identifiable email or phone number fields. Attempts to find common name fields (first name, last name, full name). Sends captured data upon submission.
- **CTA Tracking:** Tracks clicks on _all_ links (`<a>`) and buttons (`<button>`) on the page, excluding form submit buttons. Attempts to generate a meaningful description based on element content or attributes.
- **Contact Detail Fetching:** If a `contactId` is present in the URL, CTA clicks will attempt to fetch contact details to enrich the notification sent.
- **Vanilla JavaScript:** No external libraries like jQuery required.

## Integration Guide

Follow these steps to add the RapidFunnel tracker to your website:

1.  **Get the Script File:**

    - **Recommended:** Create a minified version of `src/rapidfunnel-tracker.js`. You can use an online tool like [Terser](https://try.terser.org/) or [javascript-minifier.com](https://javascript-minifier.com/). Save the output as `rapidfunnel-tracker.min.js`.
    - **Alternatively:** You can use the raw `src/rapidfunnel-tracker.js` file directly, but it will be larger.

2.  **Upload the Script:** Place the script file (e.g., `rapidfunnel-tracker.min.js`) onto your web server or hosting platform, typically within a `js` or `assets` folder.

3.  **Include Script in HTML:** Add the following `<script>` tag to your HTML pages, preferably just before the closing `</body>` tag.

    - **Using GitHub Pages (Recommended):**
      ```html
      <!-- Add this line before the closing </body> tag -->
      <script src="https://gkkirsch.github.io/rapidfunnel/rapidfunnel-tracker.min.js" defer></script>
      </body>
      </html>
      ```
    - **Self-Hosted:** If you uploaded the script to your own server, adjust the `src` path accordingly.
      ```html
      <!-- Example if self-hosted -->
      <!-- <script src="/path/to/your/js/rapidfunnel-tracker.min.js" defer></script> -->
      </body>
      </html>
      ```
      _Using `defer` ensures the script executes after the HTML is parsed but before the `DOMContentLoaded` event, which is ideal._

4.  **Ensure URL Parameters:** This is crucial. The tracking script **requires** the page URL to contain `userId` and `

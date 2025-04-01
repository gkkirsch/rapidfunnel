# RapidFunnel Universal Tracker Script

This repository contains the code for a JavaScript snippet designed to be embedded on websites to track user interactions with Wistia videos, contact forms, and Call-to-Action (CTA) elements (links and buttons), sending relevant data to the RapidFunnel platform.

## Purpose

The goal is to provide a lightweight, dependency-free script that website owners can easily add to their pages ("plug and play"). The script automatically detects trackable elements based on common patterns and sends interaction data to RapidFunnel, associating the activity with the correct user and resource derived from URL parameters.

## Features

- **URL Parameter Extraction:** Automatically reads `userId`, `resourceId`, and `contactId` from the URL query string.
- **Wistia Video Tracking:** Detects embedded Wistia videos and tracks `play` events using the Wistia Player API (`_wq`).
- **Form Submission Tracking:** Automatically detects forms containing identifiable email or phone number fields. Attempts to find common name fields (first name, last name, full name). Sends captured data upon submission.
- **CTA Tracking:** Tracks clicks on _all_ links (`<a>`) and buttons (`<button>`) on the page, excluding form submit buttons. Attempts to generate a meaningful description based on element content or attributes.
- **Contact Detail Fetching:** If a `contactId` is present in the URL, CTA clicks will attempt to fetch contact details to enrich the notification sent.

## Integration Guide

Follow these steps to add the RapidFunnel tracker to your website:

1.  **Include Script in HTML:** Add the following `<script>` tag within the `<head>` section of your HTML pages.

    ```html
    <script
      src="https://gkkirsch.github.io/rapidfunnel/rapidfunnel-tracker.min.js"
      defer
    ></script>
    ```

    _Using `defer` allows the script to load without blocking page rendering and ensures it executes after the HTML is parsed._

2.  **Ensure URL Parameters:** This is crucial. The tracking script **requires** the page URL to contain `userId` and `resourceId` parameters when the page is loaded via a RapidFunnel share. The `contactId` parameter is also used if present (for video/CTA tracking context).
    _Example URL:_ `https://yourwebsite.com/landing-page?userId=12345&resourceId=67890&contactId=112233`

3.  **(Optional) Configure Behavior:** You can customize some tracking behavior by defining global JavaScript variables _before_ the main tracker script loads. See the **Configuration** section below for details.

4.  **Wistia Videos:** Ensure your Wistia videos are embedded using standard Wistia methods so that the `_wq` Player API is available on the page.

5.  **Forms:** The script attempts to find forms with at least an email (`<input type="email">` or common names) or phone (`<input type="tel">` or common names) field. It also looks for common first/last/full name fields. It might not correctly identify fields in all custom form structures. For maximum reliability with form tracking, using HTML similar to the RapidFunnel documentation examples (which may use specific classes) is recommended if possible, although the script _tries_ to work without them.

## Configuration

You can customize the tracker's behavior by defining specific global JavaScript variables **before** including the main `rapidfunnel-tracker.min.js` script tag. Add a separate `<script>` block for this purpose:

```html
<script>
  // Example configuration settings:
  // window.rapidFunnelPageName = "My Awesome Landing Page";
  // window.rapidFunnelCampaignId = 123;
  // window.rapidFunnelLabelId = 456;
  // window.rapidFunnelNextPage = "https://yourwebsite.com/thank-you";
</script>

<!-- Include the main tracker script AFTER the configuration block -->
<script
  src="https://gkkirsch.github.io/rapidfunnel/rapidfunnel-tracker.min.js"
  defer
></script>
```

Here are the available configuration variables:

- **`window.rapidFunnelPageName`**

  - **Purpose:** Sets a custom name for the current page, used in CTA notifications.
  - **Default:** If not set, defaults to the page's pathname (`window.location.pathname`).

- **`window.rapidFunnelCampaignId`**

  - **Purpose:** Specifies the ID of a RapidFunnel email campaign to assign to new contacts created via tracked forms.
  - **Default:** If not set, defaults to `0` (no campaign).

- **`window.rapidFunnelLabelId`**

  - **Purpose:** Specifies the ID of a RapidFunnel label (contact tag) to assign to new contacts created via tracked forms.
  - **Default:** If not set, defaults to `0` (no label).

- **`window.rapidFunnelNextPage`**
  - **Purpose:** Defines the URL where the user should be redirected after successfully submitting a tracked form.
  - **Default:** If not set, the script looks for a `data-redirect` attribute on an element with `id="contactFormSubmitContainer"`. If neither is found, the user stays on the current page (an alert confirms success).
  - **Note:** The script automatically appends `userId`, `resourceId`, and the newly created `contactId` to this URL before redirecting.

## Development

- The main source code is in `src/rapidfunnel-tracker.js`.
- `index.html` provides a test page for local development.

## Dependencies

- None for the runtime script.


# HTML Client for the Dashboard Builder Sample
This is an HTML and JavaScript client that uses the Java server in this GitHub Organization.

## **Usage**
To run the app:

- download and run the  [Java-Server](https://github.com/RevealBI-JavaBuilder/Java-Server) server app.
- download the `dashboard-builder.html` in this repository and open. 

## **Running App**
Your running application should look like this:

<img width="750" alt="image" src="https://github.com/user-attachments/assets/78fae750-c526-4211-bde7-8b3bd31f3a91">

---

# Understanding the Dashboard Builder HTML Client App

This project provides a web-based interface for visualizing and generating dashboards using the Reveal SDK. The application allows users to select visualizations from a list, preview individual visualizations, and dynamically generate custom dashboards.

---

## Table of Contents

1. [Features](#features)
2. [Technologies Used](#technologies-used)
3. [Setup Instructions](#setup-instructions)
5. [Code Comments](#code-comments)

---

## Features

- **Visualization List**: Displays a list of available visualizations fetched from an API.
- **Single Visualization Preview**: View individual visualizations in a preview pane.
- **Dynamic Dashboard Generation**: Add visualizations to a generated dashboard, edit, and organize them.

---

## Technologies Used

- **Frontend**:
  - HTML5, CSS3 (Bootstrap 5 for styling)
  - JavaScript (ES6+)
- **Libraries**:
  - jQuery
  - Day.js
- **Backend API**:
  - Fetches visualization metadata from an endpoint (customizable) from [Java-Server](https://github.com/RevealBI-JavaBuilder/Java-Server).

---

## Setup Instructions

1. **Install Dependencies**:
   Ensure you have a running server that provides visualization metadata via an API. Replace the `API_BASE_URL` with your server's endpoint.

2. **Reveal SDK Setup**:
   - Include Reveal SDK's scripts in your project.
   - Update the base URL using `$.ig.RevealSdkSettings.setBaseUrl()` to match your Reveal API endpoint.

3. **Run the Project**:
   Open the `index.html` file in any browser. Ensure CORS is enabled on your server if testing locally.

4. **API Endpoints**:
   - `API_BASE_URL`: Fetches the list of visualizations.
   - `IMAGE_URL`: Provides the URLs for visualization thumbnails.

---

## Code Comments

Below are the explanations for key code blocks:

### HTML Structure
- **Sidebar**:
  - Displays the visualization list and a single visualization preview.
- **Main Content**:
  - Displays the generated dashboard in edit mode.

### JavaScript Logic

1. **Initialization**:
   ```javascript
   const API_BASE_URL = "http://localhost:5111/reveal-api/dashboards/visualizations";
   $.ig.RevealSdkSettings.setBaseUrl("http://localhost:5111/reveal-api");
   ```
   Configure the API and Reveal SDK base URLs.

2. **Fetching Visualizations**:
   ```javascript
   async function fetchVisualizations() {
       const response = await fetch(API_BASE_URL);
       const visualizations = await response.json();
       populateVisualizationList(visualizations);
   }
   ```
   Fetches visualizations from the backend and populates the list.

3. **Visualization Click Event**:
   ```javascript
   function handleVisualizationClick(viz, listItem) {
       // Loads and displays a single visualization in preview mode.
   }
   ```

4. **Adding Visualization to Dashboard**:
   ```javascript
   function addVisualization(event, vizJson) {
       // Adds a visualization to the selected list for dashboard generation.
   }
   ```

5. **Generating Dashboard**:
   ```javascript
   async function generateDashboard() {
       const dashboardDocument = new dom.RdashDocument("Generated Dashboard");
       // Imports visualizations and generates a dynamic dashboard.
   }
   ```

### Styles
- **Responsive Layout**:
  - Bootstrap is used for grid layout.
- **Scroll and Overflow**:
  - `.scrollable-list` ensures visualization list fits within the viewport.
